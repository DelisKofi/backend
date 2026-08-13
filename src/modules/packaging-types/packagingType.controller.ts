import type { Request, Response, NextFunction } from 'express';
import { PackagingType } from './packagingType.model.js';
import { AppError } from '../../errors/AppError.js';

export const getPackagingTypes = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const types = await PackagingType.find().sort({ name: 1 }).lean();
    res.status(200).json({ success: true, data: types });
  } catch (error) { next(error); }
};

export const getPackagingType = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const type = await PackagingType.findById(req.params.id).lean();
    if (!type) throw new AppError('Packaging type not found', 404);
    res.status(200).json({ success: true, data: type });
  } catch (error) { next(error); }
};

export const createPackagingType = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name } = req.body;
    const type = await PackagingType.create({ name });
    res.status(201).json({ success: true, data: type });
  } catch (error) { 
    if (error && typeof error === 'object' && (error as Record<string, unknown>).code === 11000) {
      next(new AppError('Packaging type name already exists', 409));
    } else {
      next(error); 
    }
  }
};

export const updatePackagingType = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name } = req.body;
    
    const type = await PackagingType.findByIdAndUpdate(
      req.params.id,
      { name },
      { new: true, runValidators: true }
    );
    if (!type) throw new AppError('Packaging type not found', 404);
    res.status(200).json({ success: true, data: type });
  } catch (error) {
    if (error && typeof error === 'object' && (error as Record<string, unknown>).code === 11000) {
      next(new AppError('Packaging type name already exists', 409));
    } else {
      next(error); 
    }
  }
};

export const deletePackagingType = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const isReferenced = await import('../products/product.model.js').then(m => m.Product.exists({
      'packaging.configurations.packagingTypeId': req.params.id
    }));
    if (isReferenced) {
      throw new AppError('Type is referenced by products', 409);
    }
    const type = await PackagingType.findByIdAndDelete(req.params.id);
    if (!type) throw new AppError('Packaging type not found', 404);
    res.status(200).json({ success: true, message: 'Packaging type deleted' });
  } catch (error) { next(error); }
};
