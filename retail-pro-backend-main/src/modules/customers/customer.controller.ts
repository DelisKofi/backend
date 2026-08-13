import type { Request, Response, NextFunction } from 'express';
import { Customer, type ICustomer } from './customer.model.js';
import { AppError } from '../../errors/AppError.js';
import { getPagination } from '../../utils/pagination.js';

export const getCustomers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { branchId } = req.query;
    const query: Record<string, unknown> = {};
    if (!req.query.includeDeleted) {
      query.deletedAt = null;
    }
    if (branchId) query.branchId = branchId;

    const { page, limit } = getPagination(req);
    let total: number | undefined;
    let queryBuilder = Customer.find(query as Record<string, unknown>);

    if (page && limit) {
      const skip = (page - 1) * limit;
      queryBuilder = queryBuilder.skip(skip).limit(limit);
      total = await Customer.countDocuments(query as Record<string, unknown>);
    }

    const customers = await queryBuilder.lean();
    res.status(200).json({
      success: true,
      data: customers,
      ...(page && limit && {
        meta: { total, page, limit },
      }),
    });
  } catch (error) { next(error); }
};

export const getCustomer = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const customer = await Customer.findById(req.params.id).lean();
    if (!customer) throw new AppError('Customer not found', 404);
    res.status(200).json({ success: true, data: customer });
  } catch (error) { next(error); }
};

export const createCustomer = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, phone, email, tier, branchId, totalPurchases, lastPurchaseDate } = req.body;
    if (!name || !phone) throw new AppError('name and phone are required', 400);
    
    const customerData: Partial<ICustomer> = {
      name,
      phone,
      email,
      tier,
      branchId,
      totalPurchases: totalPurchases || 0,
    };

    if (lastPurchaseDate) {
      customerData.lastPurchaseDate = new Date(lastPurchaseDate);
    }

    const customer = await Customer.create(customerData);
    res.status(201).json({ success: true, data: customer });
  } catch (error) { next(error); }
};

export const updateCustomer = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, phone, email, tier, totalPurchases, lastPurchaseDate, branchId } = req.body;
    
    const updateData: Partial<ICustomer> = {
      name,
      phone,
      email,
      tier,
      totalPurchases,
      branchId,
    };

    if (lastPurchaseDate) {
      updateData.lastPurchaseDate = new Date(lastPurchaseDate);
    }

    const customer = await Customer.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );
    if (!customer) throw new AppError('Customer not found', 404);
    res.status(200).json({ success: true, data: customer });
  } catch (error) { next(error); }
};

export const deleteCustomer = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const customer = await Customer.findByIdAndUpdate(req.params.id, { deletedAt: new Date() }, { new: true });
    if (!customer) throw new AppError('Customer not found', 404);
    res.status(200).json({ success: true, data: null });
  } catch (error) { next(error); }
};
