import type { Request, Response, NextFunction } from 'express';
import { DebtCredit, type IDebtCredit } from './debt.model.js';
import { AppError } from '../../errors/AppError.js';
import { getPagination } from '../../utils/pagination.js';
import type { AuthRequest } from '../../middlewares/authMiddleware.js';
import { createDebtSchema, updateDebtSchema, paymentSchema, type UpdateDebtInput } from './debt.validation.js';

const derivePaymentDirection = (type: 'receivable' | 'payable') => (type === 'receivable' ? 'in' : 'out');

const recompute = (vals: { paidAmount?: number; amount?: number }) => {
  const paidAmount = vals.paidAmount ?? 0;
  const amount = vals.amount ?? 0;
  const balance = amount - paidAmount;
  let status: 'open' | 'partial' | 'settled' = 'open';
  if (paidAmount <= 0) status = 'open';
  else if (balance > 0) status = 'partial';
  else status = 'settled';
  return { paidAmount, balance, status };
};

export const listDebts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { type, status, branchId, customerId, dueDateFrom, dueDateTo, search } = req.query;
    const query: Record<string, unknown> = {};
    if (type) query.type = type;
    if (status) query.status = status;
    if (branchId) query.branchId = branchId;
    if (customerId) query.customerId = customerId;
    if (dueDateFrom || dueDateTo) {
      const dueFilter: Record<string, Date> = {};
      if (dueDateFrom) dueFilter.$gte = new Date(String(dueDateFrom)) as unknown as Date;
      if (dueDateTo) dueFilter.$lte = new Date(String(dueDateTo)) as unknown as Date;
      query.dueDate = dueFilter;
    }

    if (search) {
      (query as Record<string, unknown>).$text = { $search: String(search) };
    }

    const { page, limit } = getPagination(req);
    let total: number | undefined;
    let queryBuilder = DebtCredit.find(query as Record<string, unknown>);
    if (page && limit) {
      const skip = (page - 1) * limit;
      queryBuilder = queryBuilder.skip(skip).limit(limit);
      total = await DebtCredit.countDocuments(query as Record<string, unknown>);
    }
    const docs = await queryBuilder.lean();
    res.status(200).json({
      success: true,
      data: docs,
      ...(page && limit && { meta: { total, page, limit } }),
    });
  } catch (error) {
    next(error);
  }
};

// Convenience wrappers when frontend prefers dedicated endpoints
export const listDebtors = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // reuse list logic but force type=receivable
    const forcedQuery = { ...req.query, type: 'receivable' } as Record<string, unknown>;
    // replicate listDebts logic with forcedQuery
    const pageLimit: { page?: number; limit?: number } = {};
    if (forcedQuery.page !== undefined) pageLimit.page = Number(forcedQuery.page);
    if (forcedQuery.limit !== undefined) pageLimit.limit = Number(forcedQuery.limit);
    const { page, limit } = pageLimit;
    const query: Record<string, unknown> = {};
    if (forcedQuery.type) query.type = forcedQuery.type;
    if (forcedQuery.status) query.status = forcedQuery.status;
    if (forcedQuery.branchId) query.branchId = forcedQuery.branchId;
    if (forcedQuery.customerId) query.customerId = forcedQuery.customerId;
    if (forcedQuery.dueDateFrom || forcedQuery.dueDateTo) {
      const dueFilter: Record<string, Date> = {};
      if (forcedQuery.dueDateFrom) dueFilter.$gte = new Date(String(forcedQuery.dueDateFrom)) as unknown as Date;
      if (forcedQuery.dueDateTo) dueFilter.$lte = new Date(String(forcedQuery.dueDateTo)) as unknown as Date;
      query.dueDate = dueFilter;
    }
    if (forcedQuery.search) {
      (query as Record<string, unknown>).$text = { $search: String(forcedQuery.search) };
    }
    let total: number | undefined;
    let queryBuilder = DebtCredit.find(query as Record<string, unknown>);
    if (page && limit) {
      const skip = (page - 1) * limit;
      queryBuilder = queryBuilder.skip(skip).limit(limit);
      total = await DebtCredit.countDocuments(query as Record<string, unknown>);
    }
    const docs = await queryBuilder.lean();
    res.status(200).json({
      success: true,
      data: docs,
      ...(page && limit && { meta: { total, page, limit } }),
    });
  } catch (error) {
    next(error);
  }
};

export const listCreditors = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const forcedQuery = { ...req.query, type: 'payable' } as Record<string, unknown>;
    const pageLimit: { page?: number; limit?: number } = {};
    if (forcedQuery.page !== undefined) pageLimit.page = Number(forcedQuery.page);
    if (forcedQuery.limit !== undefined) pageLimit.limit = Number(forcedQuery.limit);
    const { page, limit } = pageLimit;
    const query: Record<string, unknown> = {};
    if (forcedQuery.type) query.type = forcedQuery.type;
    if (forcedQuery.status) query.status = forcedQuery.status;
    if (forcedQuery.branchId) query.branchId = forcedQuery.branchId;
    if (forcedQuery.customerId) query.customerId = forcedQuery.customerId;
    if (forcedQuery.dueDateFrom || forcedQuery.dueDateTo) {
      const dueFilter: Record<string, Date> = {};
      if (forcedQuery.dueDateFrom) dueFilter.$gte = new Date(String(forcedQuery.dueDateFrom)) as unknown as Date;
      if (forcedQuery.dueDateTo) dueFilter.$lte = new Date(String(forcedQuery.dueDateTo)) as unknown as Date;
      query.dueDate = dueFilter;
    }
    if (forcedQuery.search) {
      (query as Record<string, unknown>).$text = { $search: String(forcedQuery.search) };
    }
    let total: number | undefined;
    let queryBuilder = DebtCredit.find(query as Record<string, unknown>);
    if (page && limit) {
      const skip = (page - 1) * limit;
      queryBuilder = queryBuilder.skip(skip).limit(limit);
      total = await DebtCredit.countDocuments(query as Record<string, unknown>);
    }
    const docs = await queryBuilder.lean();
    res.status(200).json({
      success: true,
      data: docs,
      ...(page && limit && { meta: { total, page, limit } }),
    });
  } catch (error) {
    next(error);
  }
};

export const getDebt = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const doc = await DebtCredit.findById(req.params.id).lean();
    if (!doc) throw new AppError('Record not found', 404);
    res.status(200).json({ success: true, data: doc });
  } catch (error) {
    next(error);
  }
};

export const createDebt = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const parsed = createDebtSchema.parse(req.body);
    if (parsed.type === 'receivable' && !parsed.customerId) {
      throw new AppError('receivable must include customerId', 400);
    }
    const paymentDirection = derivePaymentDirection(parsed.type);
    const payload: Record<string, unknown> = {
      ...parsed,
      paidAmount: 0,
      balance: parsed.amount,
      status: 'open',
      paymentDirection,
    };
    const created = await DebtCredit.create(payload);
    res.status(201).json({ success: true, data: created });
  } catch (error) {
    next(error);
  }
};

export const updateDebt = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const parsed = updateDebtSchema.parse(req.body) as UpdateDebtInput;
    const existing = await DebtCredit.findById(req.params.id);
    if (!existing) throw new AppError('Record not found', 404);
    // apply changes
    Object.assign(existing, parsed);
    // recompute balance/status if amount or paidAmount changed
    const paidAmount = (existing.paidAmount as number) ?? 0;
    const amount = (existing.amount as number) ?? 0;
    const { balance, status } = recompute({ paidAmount, amount });
    existing.paidAmount = paidAmount;
    existing.balance = balance;
    const parsedStatus = ('status' in parsed ? (parsed as unknown as { status?: 'open' | 'partial' | 'settled' }).status : undefined);
    existing.status = parsedStatus ?? status;
    await existing.save();
    res.status(200).json({ success: true, data: existing });
  } catch (error) {
    next(error);
  }
};

export const deleteDebt = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const doc = await DebtCredit.findByIdAndUpdate(req.params.id, { deletedAt: new Date() }, { new: true });
    if (!doc) throw new AppError('Record not found', 404);
    res.status(200).json({ success: true, message: 'Record deleted successfully' });
  } catch (error) {
    next(error);
  }
};

export const addPayment = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const parsed = paymentSchema.parse(req.body);
    const doc = await DebtCredit.findById(req.params.id);
    if (!doc) throw new AppError('Record not found', 404);
    const currentBalance = doc.balance ?? (doc.amount - doc.paidAmount);
    if (parsed.amount > currentBalance) {
      throw new AppError('Payment amount exceeds outstanding balance', 400);
    }
    const payment = {
      amount: parsed.amount,
      paidAt: parsed.paidAt,
      note: parsed.note,
      recordedBy: req.user?.id,
    };
    doc.payments.push(payment as IDebtCredit['payments'][number]);
    doc.paidAmount = (doc.paidAmount ?? 0) + parsed.amount;
    const { balance, status } = recompute({ paidAmount: doc.paidAmount, amount: doc.amount });
    doc.balance = balance;
    doc.status = status;
    await doc.save();
    res.status(201).json({ success: true, data: doc });
  } catch (error) {
    next(error);
  }
};

export const dashboard = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const receivables = await DebtCredit.aggregate([
      { $match: { type: 'receivable', deletedAt: null } },
      { $group: { _id: null, total: { $sum: '$amount' }, paid: { $sum: '$paidAmount' } } },
    ]);
    const payables = await DebtCredit.aggregate([
      { $match: { type: 'payable', deletedAt: null } },
      { $group: { _id: null, total: { $sum: '$amount' }, paid: { $sum: '$paidAmount' } } },
    ]);
    const overdue = await DebtCredit.aggregate([
      { $match: { dueDate: { $lt: new Date() }, status: { $ne: 'settled' }, deletedAt: null } },
      { $group: { _id: null, total: { $sum: '$balance' } } },
    ]);
    const counts = await DebtCredit.aggregate([
      { $match: { deletedAt: null } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);
    const mapCount = Object.fromEntries((counts as { _id: string; count: number }[]).map((c) => [c._id, c.count]));
    const receivablesTotal = receivables[0]?.total ?? 0;
    const payablesTotal = payables[0]?.total ?? 0;
    const overdueTotal = overdue[0]?.total ?? 0;
    const netPosition = receivablesTotal - payablesTotal;
    res.status(200).json({
      success: true,
      data: {
        receivablesTotal,
        payablesTotal,
        overdueTotal,
        netPosition,
        openCount: mapCount.open ?? 0,
        partialCount: mapCount.partial ?? 0,
        settledCount: mapCount.settled ?? 0,
      },
    });
  } catch (error) {
    next(error);
  }
};

