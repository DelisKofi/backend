import type { Response, NextFunction } from 'express';
import type { AuthRequest } from '../../middlewares/authMiddleware.js';
import { AppError } from '../../errors/AppError.js';
import { getPagination } from '../../utils/pagination.js';
import { roundToCents } from '../../utils/money.js';
import {
  DailyReconciliation,
  type IDailyReconciliation,
} from './reconciliation.model.js';
import {
  listQuerySchema,
  byDateQuerySchema,
  startEodSchema,
  closeSchema,
} from './reconciliation.validation.js';
import {
  buildDetailFromRecord,
  computeDayTotals,
  findPendingDays,
  findReconciliationByIdOrPending,
  formatUtcDate,
  isPendingId,
  materializeReconciliation,
  pendingToListItem,
  recordToListItem,
  ReconciliationNotFoundError,
} from './reconciliation.service.js';

const handleNotFound = (error: unknown) =>
  error instanceof ReconciliationNotFoundError;

const paramId = (value: string | string[] | undefined) => {
  const id = Array.isArray(value) ? value[0] : value;
  if (!id) throw new AppError('Invalid reconciliation id', 400);
  return id;
};

export const listReconciliations = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const parsed = listQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      throw new AppError(parsed.error.issues[0]?.message ?? 'Invalid query', 400);
    }
    const { branchId, startDate, endDate, status, hasVariance } = parsed.data;
    const { page, limit } = getPagination(req);

    const query: Record<string, unknown> = { branchId };
    if (startDate || endDate) {
      const dateFilter: Record<string, string> = {};
      if (startDate) dateFilter.$gte = startDate;
      if (endDate) dateFilter.$lte = endDate;
      query.date = dateFilter;
    }
    if (status) query.status = status;
    if (hasVariance === true) {
      query.status = 'Closed';
      query.variance = { $ne: 0 };
    }

    const records = await DailyReconciliation.find(query)
      .sort({ date: -1 })
      .lean();

    let items = records.map((r) =>
      recordToListItem(r as unknown as IDailyReconciliation)
    );

    const lastItem = items.at(-1);
    const rangeStart =
      startDate ?? lastItem?.date ?? formatUtcDate(new Date());
    const rangeEnd = endDate ?? formatUtcDate(new Date());

    if (!status || status === 'Open') {
      const pendingDates = await findPendingDays(branchId, rangeStart, rangeEnd);
      const pendingItems = await Promise.all(
        pendingDates.map((d) => pendingToListItem(branchId, d))
      );
      items = [...items, ...pendingItems];
    }

    items.sort((a, b) => b.date.localeCompare(a.date));

    let paginatedItems = items;
    const total = items.length;
    if (page && limit) {
      const skip = (page - 1) * limit;
      paginatedItems = items.slice(skip, skip + limit);
    }

    res.status(200).json({
      success: true,
      data: paginatedItems,
      ...(page &&
        limit && {
          meta: { total, page, limit },
        }),
    });
  } catch (error) {
    next(error);
  }
};

export const getReconciliationByDate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const parsed = byDateQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      throw new AppError(parsed.error.issues[0]?.message ?? 'Invalid query', 400);
    }
    const { branchId, date } = parsed.data;

    const record = await DailyReconciliation.findOne({ branchId, date });
    const id = record?._id ?? `pending:${branchId}:${date}`;
    const detail = await buildDetailFromRecord(record, branchId, date, id);

    res.status(200).json({ success: true, data: detail });
  } catch (error) {
    next(error);
  }
};

export const getReconciliation = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { record, branchId, date, resolvedId } =
      await findReconciliationByIdOrPending(paramId(req.params.id));
    const detail = await buildDetailFromRecord(record, branchId, date, resolvedId);
    res.status(200).json({ success: true, data: detail });
  } catch (error) {
    if (handleNotFound(error)) {
      next(new AppError('Reconciliation not found', 404));
      return;
    }
    next(error);
  }
};

export const startEod = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const parsed = startEodSchema.parse(req.body);
    const date = parsed.date ?? formatUtcDate(new Date());
    const { branchId } = parsed;

    const existing = await DailyReconciliation.findOne({ branchId, date });
    if (existing) {
      throw new AppError('Reconciliation already exists for this branch and date', 409);
    }

    const snapshotAt = new Date();
    const totals = await computeDayTotals(branchId, date, { snapshotAt });
    const record = await DailyReconciliation.create({
      branchId,
      date,
      status: 'Open',
      expectedCash: totals.expectedCash,
      expectedCard: totals.expectedCard,
      expectedMomo: totals.expectedMomo,
      creditSales: totals.creditSales,
      totalSales: totals.totalSales,
      snapshotAt,
      openedAt: new Date(),
    });

    const detail = await buildDetailFromRecord(record, branchId, date, record._id);
    res.status(201).json({ success: true, data: detail });
  } catch (error) {
    next(error);
  }
};

export const closeReconciliation = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) throw new AppError('Unauthorized', 401);
    const parsed = closeSchema.parse(req.body);
    const { record, branchId, date } = await findReconciliationByIdOrPending(
      paramId(req.params.id)
    );

    let doc = record;
    if (!doc) {
      doc = await materializeReconciliation(branchId, date);
    }

    if (doc.status === 'Closed') {
      throw new AppError('Reconciliation is already closed', 400);
    }

    const totals = await computeDayTotals(
      branchId,
      date,
      doc.snapshotAt ? { snapshotAt: doc.snapshotAt } : undefined
    );

    if (totals.transactionCount === 0) {
      throw new AppError('No completed transactions for this day', 400);
    }

    const expectedCash = doc.snapshotAt ? doc.expectedCash : totals.expectedCash;
    const expectedCard = doc.snapshotAt ? doc.expectedCard : totals.expectedCard;
    const expectedMomo = doc.snapshotAt ? doc.expectedMomo : totals.expectedMomo;
    const creditSales = doc.snapshotAt ? doc.creditSales : totals.creditSales;
    const totalSales = doc.snapshotAt ? doc.totalSales : totals.totalSales;

    const actualCash = roundToCents(parsed.actualAmounts.cash);
    const actualCard = roundToCents(parsed.actualAmounts.card);
    const actualMomo = roundToCents(parsed.actualAmounts.momo);
    const variance = roundToCents(actualCash - expectedCash);

    if (Math.abs(variance) > 0.01 && !parsed.notes?.trim()) {
      throw new AppError('Notes are required when cash variance is not zero', 400);
    }

    doc.expectedCash = expectedCash;
    doc.expectedCard = expectedCard;
    doc.expectedMomo = expectedMomo;
    doc.creditSales = creditSales;
    doc.totalSales = totalSales;
    doc.actualCash = actualCash;
    doc.actualCard = actualCard;
    doc.actualMomo = actualMomo;
    doc.variance = variance;
    const trimmedNotes = parsed.notes?.trim();
    if (trimmedNotes) {
      doc.notes = trimmedNotes;
    } else {
      doc.set('notes', undefined);
    }
    doc.status = 'Closed';
    doc.closedAt = new Date();
    doc.closedBy = req.user.id;
    await doc.save();

    const detail = await buildDetailFromRecord(doc, branchId, date, doc._id);
    res.status(200).json({ success: true, data: detail });
  } catch (error) {
    if (handleNotFound(error)) {
      next(new AppError('Reconciliation not found', 404));
      return;
    }
    next(error);
  }
};

export const reopenReconciliation = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = paramId(req.params.id);
    if (isPendingId(id)) {
      throw new AppError('Cannot reopen a pending reconciliation that was never closed', 400);
    }

    const doc = await DailyReconciliation.findById(id);
    if (!doc) throw new AppError('Reconciliation not found', 404);
    if (doc.status !== 'Closed') {
      throw new AppError('Reconciliation is not closed', 400);
    }

    doc.status = 'Open';
    doc.reopenedAt = new Date();
    await DailyReconciliation.findByIdAndUpdate(doc._id, {
      $set: { status: 'Open', reopenedAt: doc.reopenedAt },
      $unset: { closedAt: '', closedBy: '' },
    });
    const refreshed = await DailyReconciliation.findById(doc._id);
    if (!refreshed) throw new AppError('Reconciliation not found', 404);

    const detail = await buildDetailFromRecord(
      refreshed,
      refreshed.branchId,
      refreshed.date,
      refreshed._id
    );
    res.status(200).json({ success: true, data: detail });
  } catch (error) {
    next(error);
  }
};
