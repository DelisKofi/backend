import type { Request, Response, NextFunction } from 'express';
import { Expense, EXPENSE_CATEGORIES } from './expense.model.js';
import { AppError } from '../../errors/AppError.js';
import type { AuthRequest } from '../../middlewares/authMiddleware.js';
import { getPagination } from '../../utils/pagination.js';

export const getExpenses = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { branchId, source, category, startDate, endDate } = req.query;
    const query: Record<string, unknown> = { deletedAt: null };

    if (branchId) query.branchId = branchId;
    if (source) query.source = source;
    if (category) query.category = category;

    if (startDate || endDate) {
      const dateQuery: Record<string, Date> = {};
      if (startDate) dateQuery.$gte = new Date(startDate as string);
      if (endDate) dateQuery.$lte = new Date(endDate as string);
      query.spentAt = dateQuery;
    }

    const { page, limit } = getPagination(req);
    let total: number | undefined;
    let queryBuilder = Expense.find(query).sort({ spentAt: -1 });

    if (page && limit) {
      const skip = (page - 1) * limit;
      queryBuilder = queryBuilder.skip(skip).limit(limit);
      total = await Expense.countDocuments(query);
    }

    const expenses = await queryBuilder.lean();
    res.status(200).json({
      success: true,
      data: expenses,
      ...(page && limit && { meta: { total, page, limit } }),
    });
  } catch (error) { next(error); }
};

export const getExpenseDashboard = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { branchId, startDate, endDate } = req.query;
    const match: Record<string, unknown> = { deletedAt: null };

    if (branchId) match.branchId = branchId;
    if (startDate || endDate) {
      const dateQuery: Record<string, Date> = {};
      if (startDate) dateQuery.$gte = new Date(startDate as string);
      if (endDate) dateQuery.$lte = new Date(endDate as string);
      match.spentAt = dateQuery;
    }

    const aggregation = await Expense.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$category',
          total: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
      { $sort: { total: -1 } },
    ]);

    // Build a full map with all categories (zero if no data)
    const categoryTotals = EXPENSE_CATEGORIES.reduce<Record<string, { total: number; count: number }>>((acc, cat) => {
      acc[cat] = { total: 0, count: 0 };
      return acc;
    }, {});

    aggregation.forEach((row) => {
      if (row._id in categoryTotals) {
        categoryTotals[row._id] = { total: row.total, count: row.count };
      }
    });

    const grandTotal = aggregation.reduce((sum, row) => sum + row.total, 0);

    res.status(200).json({
      success: true,
      data: {
        byCategory: categoryTotals,
        grandTotal,
      },
    });
  } catch (error) { next(error); }
};

export const getExpense = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const expense = await Expense.findById(req.params.id).lean();
    if (!expense) throw new AppError('Expense not found', 404);
    res.status(200).json({ success: true, data: expense });
  } catch (error) { next(error); }
};

export const createExpense = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { spentAt, category, description, amount, source, branchId } = req.body;
    if (!spentAt || !category || amount === undefined || !source) {
      throw new AppError('spentAt, category, amount, and source are required', 400);
    }
    if (!req.user) throw new AppError('Unauthorized', 401);
    const loggedBy = `${req.user.firstName} ${req.user.lastName}`;
    const expense = await Expense.create({ spentAt, category, description, amount, source, loggedBy, branchId });

    try {
      await import('../audit-logs/auditLog.model.js').then(({ AuditLog }) => {
        return AuditLog.create({
          iconKind: 'expense',
          title: 'Expense Recorded',
          description: `Recorded expense of ${amount} for ${category}`,
          actorName: loggedBy,
          occurredAt: new Date(),
          category: 'expense',
          branchId: branchId,
          metadata: { expenseId: expense._id, amount }
        } as unknown as Record<string, unknown>);
      });
    } catch (err) {
      console.error('Failed to create audit log for expense creation:', err);
    }

    res.status(201).json({ success: true, data: expense });
  } catch (error) { next(error); }
};

export const updateExpense = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { spentAt, category, description, amount, source } = req.body;
    const expense = await Expense.findByIdAndUpdate(
      req.params.id,
      { spentAt, category, description, amount, source },
      { returnDocument: 'after', runValidators: true }
    );
    if (!expense) throw new AppError('Expense not found', 404);

    try {
      await import('../audit-logs/auditLog.model.js').then(({ AuditLog }) => {
        return AuditLog.create({
          iconKind: 'expense',
          title: 'Expense Updated',
          description: `Updated expense to ${amount} for ${category}`,
          actorName: req.user ? `${req.user.firstName} ${req.user.lastName}` : 'System',
          occurredAt: new Date(),
          category: 'expense',
          branchId: expense.branchId,
          metadata: { expenseId: expense._id, amount }
        } as unknown as Record<string, unknown>);
      });
    } catch (err) {
      console.error('Failed to create audit log for expense update:', err);
    }

    res.status(200).json({ success: true, data: expense });
  } catch (error) { next(error); }
};

export const deleteExpense = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const expense = await Expense.findByIdAndUpdate(req.params.id,      { deletedAt: new Date() },
      { returnDocument: 'after' }
    );
    if (!expense) throw new AppError('Expense not found', 404);

    try {
      await import('../audit-logs/auditLog.model.js').then(({ AuditLog }) => {
        return AuditLog.create({
          iconKind: 'expense',
          title: 'Expense Deleted',
          description: `Deleted expense of ${expense.amount}`,
          actorName: req.user ? `${req.user.firstName} ${req.user.lastName}` : 'System',
          occurredAt: new Date(),
          category: 'expense',
          branchId: expense.branchId,
          metadata: { expenseId: expense._id }
        } as unknown as Record<string, unknown>);
      });
    } catch (err) {
      console.error('Failed to create audit log for expense deletion:', err);
    }

    res.status(200).json({ success: true, data: null });
  } catch (error) { next(error); }
};
