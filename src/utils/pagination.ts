import type { Request } from 'express';
import { AppError } from '../errors/AppError.js';

export const PAGINATION_MAX_LIMIT = 1000;

type PaginationOptions = {
  pageKeys?: string[];
  limitKeys?: string[];
  maxLimit?: number;
};

const pickQueryValue = (req: Request, keys: string[]) => {
  for (const key of keys) {
    const value = req.query[key];
    if (value !== undefined) return value;
  }
  return undefined;
};

export const getPagination = (
  req: Request,
  options: PaginationOptions = {}
) => {
  const pageKeys = options.pageKeys ?? ['page'];
  const limitKeys = options.limitKeys ?? ['limit'];

  const pageRaw = pickQueryValue(req, pageKeys);
  const limitRaw = pickQueryValue(req, limitKeys);
  const maxLimit = options.maxLimit ?? PAGINATION_MAX_LIMIT;

  let page: number | undefined;
  let limit: number | undefined;

  if (pageRaw !== undefined) {
    const pageNum = Number(pageRaw);
    if (!Number.isFinite(pageNum) || pageNum < 1) {
      throw new AppError('Invalid page parameter', 400);
    }
    page = Math.floor(pageNum);
  }

  if (limitRaw !== undefined) {
    const limitNum = Number(limitRaw);
    if (!Number.isFinite(limitNum) || limitNum < 1) {
      throw new AppError('Invalid limit parameter', 400);
    }
    limit = Math.min(Math.floor(limitNum), maxLimit);
  }

  return { page, limit };
};
