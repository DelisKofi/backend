import { Transaction } from '../transactions/transaction.model.js';
import { DebtCredit } from '../debts-credits/debt.model.js';
import { Damage } from '../damages/damage.model.js';
import { User } from '../users/user.model.js';
import {
  DailyReconciliation,
  type IDailyReconciliation,
  type ReconciliationStatus,
} from './reconciliation.model.js';
import { roundToCents } from '../../utils/money.js';

const PENDING_PREFIX = 'pending:';

export type PaymentMethodKey = 'cash' | 'card' | 'momo' | 'credit';

export type DayTotals = {
  expectedCash: number;
  expectedCard: number;
  expectedMomo: number;
  creditSales: number;
  totalSales: number;
  transactionCount: number;
  debtCollections: number;
  inventoryImpact: {
    totalRecords: number;
    totalItemsLoss: number;
    financialLoss: number;
    topCause: string;
  };
  userSales: Array<{
    id: string;
    name: string;
    transactions: number;
    totalSales: number;
    cash: number;
    card: number;
    momo: number;
    credit: number;
  }>;
};

export type ListItem = {
  id: string;
  date: string;
  status: ReconciliationStatus;
  totalSales: number;
  variance: number | null;
};

export type ReconciliationDetail = {
  id: string;
  date: string;
  branchId: string;
  status: ReconciliationStatus;
  totalSales: number;
  cashSales: number;
  digitalSales: number;
  creditSales: number;
  expectedCash: number;
  actualCash: number | null;
  variance: number | null;
  notes: string | null;
  paymentBreakdown: Array<{
    key: PaymentMethodKey;
    label: string;
    expected: number;
    actual: number | null;
  }>;
  inventoryImpact: DayTotals['inventoryImpact'];
  debtImpact: {
    newReceivables: number;
    debtCollections: number;
  };
  userSales: DayTotals['userSales'];
  snapshotAt?: string;
  closedAt?: string;
  closedBy?: string;
};

export const getDayBounds = (dateStr: string) => {
  const start = new Date(`${dateStr}T00:00:00.000Z`);
  const end = new Date(`${dateStr}T23:59:59.999Z`);
  return { start, end };
};

export const formatUtcDate = (d: Date) => d.toISOString().slice(0, 10);

export const buildPendingId = (branchId: string, date: string) =>
  `${PENDING_PREFIX}${branchId}:${date}`;

export const parsePendingId = (
  id: string
): { branchId: string; date: string } | null => {
  const match = id.match(/^pending:(.+):(\d{4}-\d{2}-\d{2})$/);
  if (!match?.[1] || !match[2]) return null;
  return { branchId: match[1], date: match[2] };
};

export const isPendingId = (id: string) => id.startsWith(PENDING_PREFIX);

const paymentLabels: Record<PaymentMethodKey, string> = {
  cash: 'Cash',
  card: 'Card',
  momo: 'MoMo (MTN/Telecel/AT)',
  credit: 'Credit/Debtors',
};

const buildTransactionMatch = (
  branchId: string,
  dateStr: string,
  snapshotAt?: Date
) => {
  const { start, end } = getDayBounds(dateStr);
  const match: Record<string, unknown> = {
    branchId,
    deletedAt: null,
    status: 'completed',
    date: { $gte: start, $lte: end },
  };
  if (snapshotAt) {
    match.createdAt = { $lte: snapshotAt };
  }
  return match;
};

export const computeDayTotals = async (
  branchId: string,
  dateStr: string,
  options?: { snapshotAt?: Date }
): Promise<DayTotals> => {
  const match = buildTransactionMatch(branchId, dateStr, options?.snapshotAt);
  const { start, end } = getDayBounds(dateStr);

  const [
    paymentAgg,
    userAgg,
    debtCollectionsAgg,
    damageAgg,
    causeAgg,
    salesCountAgg,
  ] = await Promise.all([
      Transaction.aggregate([
        { $match: match },
        { $unwind: '$payments' },
        {
          $group: {
            _id: '$payments.method',
            total: { $sum: '$payments.amount' },
          },
        },
      ]),
      Transaction.aggregate([
        { $match: match },
        { $unwind: '$payments' },
        {
          $group: {
            _id: {
              userId: '$createdBy',
              method: '$payments.method',
            },
            amount: { $sum: '$payments.amount' },
            transactions: { $addToSet: '$_id' },
          },
        },
        {
          $group: {
            _id: '$_id.userId',
            methods: {
              $push: {
                method: '$_id.method',
                amount: '$amount',
              },
            },
            transactionIds: { $push: '$transactions' },
          },
        },
        {
          $project: {
            userId: '$_id',
            methods: 1,
            transactionCount: {
              $size: {
                $reduce: {
                  input: '$transactionIds',
                  initialValue: [],
                  in: { $setUnion: ['$$value', '$$this'] },
                },
              },
            },
          },
        },
      ]),
      DebtCredit.aggregate([
        {
          $match: {
            branchId,
            type: 'receivable',
            deletedAt: null,
          },
        },
        { $unwind: '$payments' },
        {
          $match: {
            'payments.paidAt': { $gte: start, $lte: end },
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$payments.amount' },
          },
        },
      ]),
      Damage.aggregate([
        {
          $match: {
            deletedAt: null,
            branchId,
            damagedAt: { $gte: start, $lte: end },
          },
        },
        {
          $group: {
            _id: null,
            totalRecords: { $sum: 1 },
            totalItemsLoss: { $sum: '$quantity' },
            financialLoss: { $sum: '$totalLoss' },
          },
        },
      ]),
      Damage.aggregate([
        {
          $match: {
            deletedAt: null,
            branchId,
            damagedAt: { $gte: start, $lte: end },
          },
        },
        { $group: { _id: '$cause', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 1 },
      ]),
      Transaction.aggregate([
        { $match: match },
        {
          $group: {
            _id: null,
            totalSales: { $sum: '$amount' },
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

  const paymentMap = Object.fromEntries(
    (paymentAgg as { _id: string; total: number }[]).map((p) => [
      p._id,
      roundToCents(p.total),
    ])
  ) as Record<string, number>;

  const salesSummary = salesSummaryFromAgg(
    paymentAgg as { _id: string; total: number }[],
    salesCountAgg as { totalSales: number; count: number }[]
  );

  const userIds = (userAgg as { userId?: string }[])
    .map((u) => u.userId)
    .filter((id): id is string => Boolean(id));
  const users =
    userIds.length > 0
      ? await User.find({ _id: { $in: userIds } })
          .select('firstName lastName')
          .lean()
      : [];
  const userNameMap = new Map(
    users.map((u) => [u._id, `${u.firstName} ${u.lastName}`.trim()])
  );

  const userSales = (
    userAgg as Array<{
      userId?: string;
      methods: { method: string; amount: number }[];
      transactionCount: number;
    }>
  ).map((row) => {
    const methodTotals = Object.fromEntries(
      row.methods.map((m) => [m.method, roundToCents(m.amount)])
    ) as Record<string, number>;
    const uid = row.userId ?? 'unknown';
    return {
      id: uid,
      name: userNameMap.get(uid) ?? 'Unknown',
      transactions: row.transactionCount,
      totalSales: roundToCents(
        row.methods.reduce((sum, m) => sum + m.amount, 0)
      ),
      cash: methodTotals.cash ?? 0,
      card: methodTotals.card ?? 0,
      momo: methodTotals.momo ?? 0,
      credit: methodTotals.credit ?? 0,
    };
  });

  const debtCollections = roundToCents(
    (debtCollectionsAgg[0] as { total?: number } | undefined)?.total ?? 0
  );

  const damageSummary = damageAgg[0] as
    | {
        totalRecords: number;
        totalItemsLoss: number;
        financialLoss: number;
      }
    | undefined;

  return {
    expectedCash: paymentMap.cash ?? 0,
    expectedCard: paymentMap.card ?? 0,
    expectedMomo: paymentMap.momo ?? 0,
    creditSales: paymentMap.credit ?? 0,
    totalSales: salesSummary.totalSales,
    transactionCount: salesSummary.transactionCount,
    debtCollections,
    inventoryImpact: {
      totalRecords: damageSummary?.totalRecords ?? 0,
      totalItemsLoss: damageSummary?.totalItemsLoss ?? 0,
      financialLoss: roundToCents(damageSummary?.financialLoss ?? 0),
      topCause:
        (causeAgg[0] as { _id?: string } | undefined)?._id?.toString() ?? 'N/A',
    },
    userSales,
  };
};

function salesSummaryFromAgg(
  paymentAgg: { _id: string; total: number }[],
  countAgg: { totalSales: number; count: number }[]
) {
  if (countAgg.length > 0 && countAgg[0]) {
    return {
      totalSales: roundToCents(countAgg[0].totalSales),
      transactionCount: countAgg[0].count,
    };
  }
  const totalSales = roundToCents(
    paymentAgg.reduce((sum, p) => sum + p.total, 0)
  );
  return { totalSales, transactionCount: 0 };
}

export const findPendingDays = async (
  branchId: string,
  startDate: string,
  endDate: string
): Promise<string[]> => {
  const start = new Date(`${startDate}T00:00:00.000Z`);
  const end = new Date(`${endDate}T23:59:59.999Z`);

  const daysWithSales = await Transaction.aggregate([
    {
      $match: {
        branchId,
        deletedAt: null,
        status: 'completed',
        date: { $gte: start, $lte: end },
      },
    },
    {
      $group: {
        _id: {
          $dateToString: { format: '%Y-%m-%d', date: '$date', timezone: 'UTC' },
        },
      },
    },
  ]);

  const saleDates = new Set(
    (daysWithSales as { _id: string }[]).map((d) => d._id)
  );
  if (saleDates.size === 0) return [];

  const existing = await DailyReconciliation.find({
    branchId,
    date: { $gte: startDate, $lte: endDate },
  })
    .select('date')
    .lean();

  const existingDates = new Set(existing.map((r) => r.date));
  return [...saleDates]
    .filter((d) => !existingDates.has(d))
    .sort((a, b) => b.localeCompare(a));
};

export const buildPaymentBreakdown = (
  totals: Pick<
    DayTotals,
    'expectedCash' | 'expectedCard' | 'expectedMomo' | 'creditSales'
  >,
  record?: Pick<
    IDailyReconciliation,
    | 'status'
    | 'actualCash'
    | 'actualCard'
    | 'actualMomo'
    | 'expectedCash'
    | 'expectedCard'
    | 'expectedMomo'
    | 'creditSales'
  > | null
): ReconciliationDetail['paymentBreakdown'] => {
  const isClosed = record?.status === 'Closed';
  const expectedByKey: Record<PaymentMethodKey, number> = {
    cash: record?.expectedCash ?? totals.expectedCash,
    card: record?.expectedCard ?? totals.expectedCard,
    momo: record?.expectedMomo ?? totals.expectedMomo,
    credit: record?.creditSales ?? totals.creditSales,
  };
  const actualByKey: Record<PaymentMethodKey, number | null> = {
    cash: isClosed ? (record?.actualCash ?? null) : null,
    card: isClosed ? (record?.actualCard ?? null) : null,
    momo: isClosed ? (record?.actualMomo ?? null) : null,
    credit: isClosed ? totals.creditSales : null,
  };

  return (['cash', 'card', 'momo', 'credit'] as PaymentMethodKey[]).map(
    (key) => ({
      key,
      label: paymentLabels[key],
      expected: expectedByKey[key],
      actual:
        key === 'credit' && isClosed
          ? totals.creditSales
          : actualByKey[key],
    })
  );
};

export const buildDetailFromRecord = async (
  record: IDailyReconciliation | null,
  branchId: string,
  dateStr: string,
  id: string
): Promise<ReconciliationDetail> => {
  const totals = await computeDayTotals(
    branchId,
    dateStr,
    record?.snapshotAt ? { snapshotAt: record.snapshotAt } : undefined
  );

  const status = record?.status ?? 'Open';
  const isClosed = status === 'Closed';
  const actualCash = isClosed ? (record?.actualCash ?? null) : null;
  const variance = isClosed ? (record?.variance ?? null) : null;

  return {
    id,
    date: dateStr,
    branchId,
    status,
    totalSales: record?.totalSales ?? totals.totalSales,
    cashSales: totals.expectedCash,
    digitalSales: roundToCents(totals.expectedCard + totals.expectedMomo),
    creditSales: totals.creditSales,
    expectedCash: record?.expectedCash ?? totals.expectedCash,
    actualCash,
    variance,
    notes: record?.notes ?? null,
    paymentBreakdown: buildPaymentBreakdown(totals, record),
    inventoryImpact: totals.inventoryImpact,
    debtImpact: {
      newReceivables: totals.creditSales,
      debtCollections: totals.debtCollections,
    },
    userSales: totals.userSales,
    ...(record?.snapshotAt && {
      snapshotAt: record.snapshotAt.toISOString(),
    }),
    ...(record?.closedAt && { closedAt: record.closedAt.toISOString() }),
    ...(record?.closedBy && { closedBy: record.closedBy }),
  };
};

export const recordToListItem = (record: IDailyReconciliation): ListItem => ({
  id: record._id,
  date: record.date,
  status: record.status,
  totalSales: record.totalSales,
  variance:
    record.status === 'Closed' && record.variance !== undefined
      ? record.variance
      : null,
});

export const pendingToListItem = async (
  branchId: string,
  dateStr: string
): Promise<ListItem> => {
  const totals = await computeDayTotals(branchId, dateStr);
  return {
    id: buildPendingId(branchId, dateStr),
    date: dateStr,
    status: 'Open',
    totalSales: totals.totalSales,
    variance: null,
  };
};

export const findReconciliationByIdOrPending = async (
  id: string
): Promise<{
  record: IDailyReconciliation | null;
  branchId: string;
  date: string;
  resolvedId: string;
}> => {
  const pending = parsePendingId(id);
  if (pending) {
    const existing = await DailyReconciliation.findOne({
      branchId: pending.branchId,
      date: pending.date,
    });
    if (existing) {
      return {
        record: existing,
        branchId: pending.branchId,
        date: pending.date,
        resolvedId: existing._id,
      };
    }
    return {
      record: null,
      branchId: pending.branchId,
      date: pending.date,
      resolvedId: id,
    };
  }

  const record = await DailyReconciliation.findById(id);
  if (!record) {
    throw new ReconciliationNotFoundError();
  }
  return {
    record,
    branchId: record.branchId,
    date: record.date,
    resolvedId: record._id,
  };
};

export class ReconciliationNotFoundError extends Error {
  constructor() {
    super('Reconciliation not found');
    this.name = 'ReconciliationNotFoundError';
  }
}

export const materializeReconciliation = async (
  branchId: string,
  dateStr: string,
  options?: { snapshotAt?: Date; expected?: DayTotals }
): Promise<IDailyReconciliation> => {
  const existing = await DailyReconciliation.findOne({ branchId, date: dateStr });
  if (existing) return existing;

  const totals =
    options?.expected ?? (await computeDayTotals(branchId, dateStr, options));

  return DailyReconciliation.create({
    branchId,
    date: dateStr,
    status: 'Open',
    expectedCash: totals.expectedCash,
    expectedCard: totals.expectedCard,
    expectedMomo: totals.expectedMomo,
    creditSales: totals.creditSales,
    totalSales: totals.totalSales,
    ...(options?.snapshotAt ? { snapshotAt: options.snapshotAt } : {}),
    openedAt: new Date(),
  });
};
