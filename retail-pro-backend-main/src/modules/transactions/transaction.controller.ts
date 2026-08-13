/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Response, NextFunction } from "express";
import mongoose from "mongoose";
import { Transaction, type ITransactionItem } from "./transaction.model.js";
import { Branch } from "../branches/branch.model.js";
import { Product } from "../products/product.model.js";
import { Customer } from "../customers/customer.model.js";
import { DebtCredit } from "../debts-credits/debt.model.js";
import { AuditLog } from "../audit-logs/auditLog.model.js";
import type { AuthRequest } from "../../middlewares/authMiddleware.js";
import { getPagination } from "../../utils/pagination.js";
import { AppError } from "../../errors/AppError.js";
import {
  type IdempotencyTransactionPayload,
  type StoredTransactionForIdempotency,
  idempotencyPayloadMatches,
} from "./transactionIdempotency.js";

const roundToCents = (value: number) =>
  Math.round((value + Number.EPSILON) * 100) / 100;

const isDuplicateKeyError = (error: unknown) => {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: number }).code === 11000
  );
};

const resolveProductStockKey = (product: any, branchId: string) => {
  const stockMap = product.stock as Map<string, number> | undefined;
  if (!stockMap) return branchId;
  if (stockMap.has(branchId)) return branchId;
  if (typeof product.branch === "string" && stockMap.has(product.branch))
    return product.branch;
  const entries = Array.from((stockMap ?? new Map<string, number>()).entries());
  const [firstEntry] = entries;
  if (firstEntry) return firstEntry[0];
  return branchId;
};

const getTransactionPayments = (transaction: any) => {
  const rawPayments = Array.isArray(transaction?.payments)
    ? transaction.payments
    : [];
  const mappedPayments = rawPayments.map((payment: any) => ({
    method: payment.method,
    amount: Number(payment.amount) || 0,
  }));
  const payments =
    mappedPayments.length > 0
      ? mappedPayments
      : transaction?.paymentMethod
        ? [
            {
              method: transaction.paymentMethod,
              amount:
                Number(transaction.amountReceived ?? transaction.amount ?? 0) ||
                0,
            },
          ]
        : [];
  const paymentMethod =
    payments.length === 1
      ? payments[0].method
      : payments.length > 1
        ? "split"
        : (transaction?.paymentMethod ?? "cash");
  const amountReceived = roundToCents(
    payments.reduce(
      (sum: number, payment: { method: string; amount: number }) =>
        payment.method === "credit" ? sum : sum + payment.amount,
      0,
    ),
  );
  const creditTotal = roundToCents(
    payments.reduce(
      (sum: number, payment: { method: string; amount: number }) =>
        payment.method === "credit" ? sum + payment.amount : sum,
      0,
    ),
  );

  return { payments, paymentMethod, amountReceived, creditTotal };
};

const normalizeTransactionResponse = (transaction: any) => {
  const doc =
    typeof transaction?.toObject === "function"
      ? transaction.toObject()
      : transaction;
  const { payments, paymentMethod, amountReceived } =
    getTransactionPayments(doc);

  return {
    ...doc,
    payments,
    paymentMethod,
    amountReceived,
  };
};

const IDEMPOTENCY_CONFLICT_MESSAGE =
  "Idempotency-Key was already used with a different request body";

const toIdempotencyPayload = (body: {
  branchId: string;
  customerId?: string | null;
  date: Date | string;
  status: string;
  amount: number;
  subtotal?: number;
  tax?: number;
  taxRate?: number;
  items: ITransactionItem[];
  payments: Array<{ method: string; amount: number }>;
}): IdempotencyTransactionPayload => ({
  branchId: body.branchId,
  customerId: body.customerId ?? null,
  date: body.date,
  status: body.status,
  amount: body.amount,
  subtotal: body.subtotal ?? 0,
  tax: body.tax ?? 0,
  taxRate: body.taxRate ?? 0,
  items: body.items.map((item) => ({
    productId: item.productId,
    quantity: item.quantity,
    price: item.price,
    unitPrice: item.unitPrice,
    packagingBreakdown: item.packagingBreakdown,
    singles: item.singles,
    totalUnits: item.totalUnits,
  })),
  payments: body.payments,
});

const sendIdempotentReplay = (
  res: Response,
  existingTransaction: StoredTransactionForIdempotency,
  incoming: IdempotencyTransactionPayload,
) => {
  if (!idempotencyPayloadMatches(existingTransaction, incoming)) {
    throw new AppError(IDEMPOTENCY_CONFLICT_MESSAGE, 409);
  }
  return res.status(200).json({
    success: true,
    data: normalizeTransactionResponse(existingTransaction),
  });
};

export const processTransaction = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  const session = await mongoose.startSession();
  const idempotencyKey = req.header("Idempotency-Key")?.trim();
  const body = req.body as {
    customerId?: string | null;
    branchId: string;
    date: Date;
    amount: number;
    subtotal?: number;
    tax?: number;
    taxRate?: number;
    paymentMethod: "cash" | "card" | "momo" | "credit" | "split";
    amountReceived: number;
    payments: Array<{
      method: "cash" | "card" | "momo" | "credit";
      amount: number;
    }>;
    status: "completed" | "pending" | "cancelled" | "draft" | "voided";
    items: ITransactionItem[];
    idempotencyKey?: string;
  };

  try {
    const idempotencyPayload = toIdempotencyPayload(body);

    if (idempotencyKey) {
      const existingTransaction = await Transaction.findOne({
        idempotencyKey,
      }).lean();
      if (existingTransaction) {
        return sendIdempotentReplay(res, existingTransaction, idempotencyPayload);
      }
    }

    session.startTransaction();

    const {
      customerId,
      branchId,
      date,
      amount,
      subtotal,
      tax,
      taxRate,
      paymentMethod,
      amountReceived,
      payments,
      status,
      items,
      idempotencyKey: bodyIdempotencyKey,
    } = body;

    const branch = await Branch.findById(branchId).session(session);
    if (!branch) {
      throw new AppError("Branch not found", 404);
    }

    const paymentDetails = getTransactionPayments({
      payments,
      paymentMethod,
      amountReceived,
    });
    const effectiveStatus = status ?? "completed";
    if (paymentDetails.payments.length === 0) {
      throw new AppError("At least one payment is required", 400);
    }

    if (effectiveStatus === "completed" && customerId) {
      const customer = await Customer.findOne({
        _id: customerId,
        deletedAt: null,
      }).session(session);
      if (!customer) {
        throw new AppError("Customer not found or has been removed", 400);
      }
    }

    // Create transaction
    const createdBy = req.user?.id;
    const newTransaction = new Transaction({
      customerId,
      branchId,
      date,
      amount,
      subtotal,
      tax,
      taxRate,
      payments: paymentDetails.payments,
      paymentMethod: paymentDetails.paymentMethod,
      amountReceived: paymentDetails.amountReceived,
      status: effectiveStatus,
      items,
      createdBy,
      idempotencyKey: idempotencyKey ?? bodyIdempotencyKey,
    });
    await newTransaction.save({ session });

    if (effectiveStatus === "completed") {
      // Manage Inventory and Customer Totals
      for (const item of items as ITransactionItem[]) {
        const product = await Product.findOne({
          _id: item.productId,
          deletedAt: null,
        }).session(session);
        if (!product) {
          const label = item.productName || item.name || item.productId;
          throw new AppError(`Product not found: ${label}`, 404);
        }
        const stockKey = resolveProductStockKey(product, branchId);
        const currentStock = product.stock.get(stockKey) || 0;
        if (currentStock < item.quantity) {
          throw new AppError(`Insufficient stock for ${product.name}`, 409);
        }
        product.stock.set(stockKey, currentStock - item.quantity);
        await product.save({ session });
      }

      const creditTotal = paymentDetails.creditTotal;
      if (creditTotal > 0) {
        if (!customerId) {
          throw new AppError(
            "Customer is required when payment includes credit",
            400,
          );
        }

        const customer = await Customer.findOne({
          _id: customerId,
          deletedAt: null,
        }).session(session);
        if (!customer) {
          throw new AppError("Customer not found or has been removed", 400);
        }

        const receivable = new DebtCredit({
          type: "receivable",
          customerId,
          partyName: customer.name,
          partyPhone: customer.phone,
          partyEmail: customer.email,
          reference: String(newTransaction._id),
          description: `POS sale ${newTransaction._id}`,
          amount: creditTotal,
          paidAmount: 0,
          balance: creditTotal,
          status: "open",
          branchId,
          paymentDirection: "in",
          source: "pos",
          transactionId: String(newTransaction._id),
          notes: `Automatically created from POS transaction ${newTransaction._id}`,
        });
        await receivable.save({ session });

        (newTransaction as any).linkedReceivableId = String(receivable._id);
        await newTransaction.save({ session });
      }

      // Update Customer Stats
      if (customerId) {
        await Customer.findByIdAndUpdate(
          customerId,
          {
            $inc: { totalPurchases: amount },
            $set: { lastPurchaseDate: date ? new Date(date) : new Date() },
          },
          { session },
        );
      }

      // Audit Log
      const auditEntry: any = {
        iconKind: "sale",
        title: `Sale Completed - ${amount}`,
        actorName: req.user
          ? `${req.user.firstName} ${req.user.lastName}`
          : "System",
        occurredAt: date ? new Date(date) : new Date(),
        category: "sale",
        branchId,
        metadata: { transactionId: newTransaction._id, customerId },
      };
      const auditLog = new (AuditLog as any)(auditEntry);
      await auditLog.save({ session });
    }

    await session.commitTransaction();
    session.endSession();

    res.status(201).json({
      success: true,
      data: normalizeTransactionResponse(newTransaction),
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();

    if (idempotencyKey && isDuplicateKeyError(error)) {
      const existingTransaction = await Transaction.findOne({
        idempotencyKey,
      }).lean();
      if (existingTransaction) {
        return sendIdempotentReplay(
          res,
          existingTransaction,
          toIdempotencyPayload(body),
        );
      }
    }

    next(error);
  }
};

export const getAll = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { dateFrom, dateTo, userId } = req.query;
    const query: Record<string, unknown> = {};
    if (!req.query.includeDeleted) {
      query.deletedAt = null;
    }
    if (req.query.branchId) {
      query.branchId = req.query.branchId;
    }
    if (req.query.status) {
      query.status = req.query.status;
    }
    if (userId) {
      query.createdBy = String(userId);
    }
    if (dateFrom || dateTo) {
      const dateFilter: Record<string, Date> = {};
      if (dateFrom) dateFilter.$gte = new Date(String(dateFrom));
      if (dateTo) {
        const toDate = new Date(String(dateTo));
        if (String(dateTo).length === 10) {
          toDate.setUTCHours(23, 59, 59, 999);
        }
        dateFilter.$lte = toDate;
      }
      query.date = dateFilter;
    }
    const { page, limit } = getPagination(req);
    let total: number | undefined;
    const filter = query as Record<string, unknown>;
    let queryBuilder = Transaction.find(filter);

    if (page && limit) {
      const skip = (page - 1) * limit;
      queryBuilder = queryBuilder.skip(skip).limit(limit);
      total = await Transaction.countDocuments(filter);
    }

    const transactions = await queryBuilder.lean();
    res.status(200).json({
      success: true,
      data: transactions.map(normalizeTransactionResponse),
      ...(page && limit && { meta: { total, page, limit } }),
    });
  } catch (error) {
    next(error);
  }
};

export const getOne = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const transaction = await Transaction.findById(req.params.id).lean();
    if (!transaction) throw new AppError("Transaction not found", 404);
    res
      .status(200)
      .json({ success: true, data: normalizeTransactionResponse(transaction) });
  } catch (error) {
    next(error);
  }
};

export const updateOne = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const transaction = await Transaction.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true },
    );
    if (!transaction) throw new AppError("Transaction not found", 404);
    res
      .status(200)
      .json({ success: true, data: normalizeTransactionResponse(transaction) });
  } catch (error) {
    next(error);
  }
};

export const deleteOne = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const transaction = await Transaction.findByIdAndUpdate(
      req.params.id,
      { deletedAt: new Date() },
      { new: true },
    );
    if (!transaction) throw new AppError("Transaction not found", 404);
    res.status(200).json({ success: true, data: null });
  } catch (error) {
    next(error);
  }
};
