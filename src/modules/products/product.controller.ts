/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Request, Response, NextFunction } from "express";
import type { AuthRequest } from "../../middlewares/authMiddleware.js";
import { Product } from "./product.model.js";
import { AppError } from "../../errors/AppError.js";
import {
  type CreateProductInput,
  type UpdateProductInput,
} from "./product.validation.js";
import { getPagination } from "../../utils/pagination.js";
import { generateProductSku } from "../../utils/productSku.js";
import { Branch } from "../branches/branch.model.js";
import {
  buildBarcodeMatchClause,
  buildDedupeQuery,
  isBranchLinked,
  parseDedupeLimit,
  parseDedupeSearchFlag,
  toDedupeCandidate,
} from "./productDedupe.js";

const mapProductStock = (product: any, stockKey?: string) => {
  const stockValue = product?.stock;
  if (!stockValue || typeof stockValue !== "object") {
    return product;
  }

  const entries = Object.entries(stockValue) as Array<[string, number]>;
  const resolvedStock = stockKey
    ? ((stockValue as Record<string, number>)[stockKey] ?? 0)
    : entries.reduce((sum, [, value]) => sum + (Number(value) || 0), 0);

  return {
    ...product,
    stock: resolvedStock,
  };
};

const normalizeProductResponse = (product: any, stockKey?: string) => {
  const normalized = mapProductStock(product, stockKey);

  if (normalized.packaging?.configurations) {
    normalized.packaging.configurations =
      normalized.packaging.configurations.map((config: any) => {
        let packagingTypeId = config.packagingTypeId;
        let packagingTypeName: string | undefined;

        if (typeof packagingTypeId === "object" && packagingTypeId !== null) {
          packagingTypeName = packagingTypeId.name;
          packagingTypeId = packagingTypeId._id || packagingTypeId.id;
        }

        return {
          ...config,
          packagingTypeId,
          packagingTypeName,
        };
      });
  }

  return {
    ...normalized,
    unitBarcode: normalized.unitBarcode ?? normalized.barcode ?? "",
  };
};

const mapProductInput = (
  input: Partial<CreateProductInput | UpdateProductInput>,
) => {
  const payload: Record<string, any> = {};

  if (input.name !== undefined) payload.name = input.name.trim();
  if ((input as any).sku !== undefined) payload.sku = (input as any).sku.trim();
  if (input.category !== undefined) payload.category = input.category;
  if (input.cost !== undefined) payload.cost = input.cost;
  if (input.retailPrice !== undefined) payload.retail = input.retailPrice;
  if (input.wholesalePrice !== undefined)
    payload.wholesale = input.wholesalePrice;
  if (input.lowStockThreshold !== undefined)
    payload.lowStockThreshold = input.lowStockThreshold;

  if (input.description !== undefined) {
    const specs = input.description.trim();
    payload.specs = specs.length > 0 ? specs : undefined;
  }

  if (input.branch !== undefined) {
    const branchName = input.branch.trim();
    payload.branch = branchName.length > 0 ? branchName : undefined;
  }

  if (input.branchId !== undefined) payload.branchId = input.branchId;

  const unitBarcode = (input as any).unitBarcode ?? (input as any).barcode;
  if (unitBarcode !== undefined) {
    const normalizedUnitBarcode = String(unitBarcode).trim();
    payload.unitBarcode =
      normalizedUnitBarcode.length > 0 ? normalizedUnitBarcode : undefined;
  }

  const imageUrls =
    (input as any).imageDataUrls?.filter(Boolean) ??
    (input as any).imageUrls?.filter(Boolean);

  if (imageUrls !== undefined) {
    payload.imageUrls = imageUrls;
    payload.imageUrl = imageUrls[0];
  } else if (input.imageUrl !== undefined) {
    payload.imageUrl = input.imageUrl;
  }

  if (input.packaging !== undefined) {
    payload.packaging = input.packaging;
  }

  if ((input as any).stockQuantity !== undefined) {
    // Always key stock by branch ID to avoid mismatch with name-keyed legacy data.
    // If branch field looks like a UUID (i.e. the frontend sent branchId in the branch field), use it.
    const rawBranch = (input as any).branch as string | undefined;
    const isUUID = rawBranch && /^[0-9a-f-]{36}$/.test(rawBranch);
    const stockKey = input.branchId ?? (isUUID ? rawBranch : undefined);
    if (stockKey) {
      payload.stock = { [stockKey]: (input as any).stockQuantity };
    }
  }

  return payload;
};

const ensureProductSku = async (payload: Record<string, any>) => {
  const inputSku = typeof payload.sku === "string" ? payload.sku.trim() : "";

  if (inputSku) {
    return payload;
  }

  const name = typeof payload.name === "string" ? payload.name.trim() : "";
  if (!name) {
    return payload;
  }

  let sku = generateProductSku(name);
  let collisionCount = 0;

  while (await Product.exists({ sku })) {
    collisionCount += 1;
    sku = generateProductSku(`${name}-${collisionCount}`);
  }

  return { ...payload, sku };
};

export const getProducts = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const dedupeSearch = parseDedupeSearchFlag(req.query.dedupeSearch);

    if (dedupeSearch) {
      const dedupe = buildDedupeQuery({
        name: typeof req.query.name === "string" ? req.query.name : undefined,
        barcode:
          typeof req.query.barcode === "string" ? req.query.barcode : undefined,
      });

      if (!dedupe) {
        throw new AppError("Dedupe search requires name and/or barcode", 400);
      }

      const dedupeLimit = parseDedupeLimit(req.query.limit);
      const products = await Product.find(dedupe.query)
        .sort({ _id: 1 })
        .limit(dedupeLimit)
        .populate("packaging.configurations.packagingTypeId", "name")
        .lean();

      return res.status(200).json({
        success: true,
        data: products.map((product) =>
          toDedupeCandidate(
            product as unknown as Record<string, unknown>,
            dedupe.matchReason,
          ),
        ),
        meta: {
          total: products.length,
          limit: dedupeLimit,
          dedupeSearch: true,
        },
      });
    }

    const { branchId, category, branch, name, sku, barcode } = req.query;
    const query: Record<string, any> = { deletedAt: null };

    if (branchId) {
      query.$or = [
        { branchId: branchId },
        { branch: branchId },
        { [`stock.${branchId}`]: { $exists: true } },
      ];
    }
    if (branch && branch !== "all") query.branch = branch;
    if (category && category !== "all") query.category = category;

    if (name) {
      query.name = { $regex: name, $options: "i" };
    }

    if (sku) {
      query.sku = { $regex: sku, $options: "i" };
    }

    if (barcode && typeof barcode === "string") {
      const barcodeClause = buildBarcodeMatchClause(barcode);
      Object.assign(query, barcodeClause);
    }

    const { page, limit } = getPagination(req);
    let total: number | undefined;
    let queryBuilder = Product.find(query)
      .sort({ _id: 1 })
      .populate("packaging.configurations.packagingTypeId", "name");

    if (page && limit) {
      const skip = (page - 1) * limit;
      queryBuilder = queryBuilder.skip(skip).limit(limit);
      total = await Product.countDocuments(query);
    }

    const products = await queryBuilder.lean();
    const stockKey = (branchId || branch) as string | undefined;

    const normalized = products.map((product) => {
      const withBranch = product.branch ? product : { ...product, branch };
      return normalizeProductResponse(withBranch, stockKey);
    });

    res.status(200).json({
      success: true,
      data: normalized,
      ...(page && limit && { meta: { total, page, limit } }),
    });
  } catch (error) {
    next(error);
  }
};

export const getProductStats = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { branchId, branch } = req.query;
    const query: Record<string, any> = { deletedAt: null };
    if (branchId) {
      query.$or = [
        { branchId: branchId },
        { branch: branchId },
        { [`stock.${branchId}`]: { $exists: true } },
      ];
    }
    if (branch && branch !== "all") query.branch = branch;

    const products = await Product.find(query).lean();
    const stockKey = (branchId || branch) as string | undefined;

    let totalSkus = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;
    let totalInventoryValue = 0;

    products.forEach((product) => {
      totalSkus++;

      // Calculate stock for the specific branch or total stock
      let stockValue = 0;
      if (stockKey) {
        stockValue = (product.stock as any)?.[stockKey] ?? 0;
      } else {
        stockValue = Object.values(product.stock || {}).reduce(
          (sum: number, val: any) => sum + (Number(val) || 0),
          0,
        );
      }

      if (stockValue <= 0) {
        outOfStockCount++;
      } else if (
        product.lowStockThreshold &&
        stockValue <= product.lowStockThreshold
      ) {
        lowStockCount++;
      }

      totalInventoryValue += (product.cost || 0) * stockValue;
    });

    res.status(200).json({
      success: true,
      data: {
        totalSkus,
        lowStockCount,
        outOfStockCount,
        totalInventoryValue,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const linkProductBranch = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { branchId, stockQuantity } = req.body as {
      branchId: string;
      stockQuantity: number;
    };

    const productId = String(req.params.id);
    const product = await Product.findOne({
      _id: productId,
      deletedAt: null,
    });
    if (!product) {
      throw new AppError("Product not found", 404);
    }

    const branch = await Branch.findById(branchId).lean();
    if (!branch) {
      throw new AppError("Branch not found", 404);
    }

    const stockObject =
      product.stock instanceof Map
        ? Object.fromEntries(product.stock.entries())
        : (product.stock as Record<string, number> | undefined);

    if (isBranchLinked(stockObject, branchId)) {
      throw new AppError("Product is already linked to this branch", 409);
    }

    product.stock.set(branchId, stockQuantity);
    await product.save();

    const populated = await Product.findById(product._id)
      .populate("packaging.configurations.packagingTypeId", "name")
      .lean();
    if (!populated) {
      throw new AppError("Error fetching linked product", 500);
    }

    try {
      await import("../audit-logs/auditLog.model.js").then(({ AuditLog }) => {
        return AuditLog.create({
          iconKind: "product",
          title: "Product Linked to Branch",
          description: `Linked ${product.name} to branch with stock ${stockQuantity}`,
          actorName: req.user
            ? `${req.user.firstName} ${req.user.lastName}`
            : "System",
          occurredAt: new Date(),
          category: "product_branch_linked",
          branchId,
          metadata: {
            productId: product._id,
            sku: product.sku,
            stockQuantity,
          },
        } as any);
      });
    } catch (err) {
      console.error("Failed to create audit log for product branch link:", err);
    }

    res.status(200).json({
      success: true,
      data: normalizeProductResponse(populated, branchId),
    });
  } catch (error) {
    next(error);
  }
};

export const getProduct = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate("packaging.configurations.packagingTypeId", "name")
      .lean();
    if (!product) throw new AppError("Product not found", 404);
    const normalized = normalizeProductResponse(product);
    res.status(200).json({ success: true, data: normalized });
  } catch (error) {
    next(error);
  }
};

export const scanProductByBarcode = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { barcode } = req.params;
    const { branchId } = req.query;

    if (!branchId || typeof branchId !== "string") {
      throw new AppError("Branch ID is required", 400);
    }

    const cleanBarcode = String(barcode).trim();
    if (!cleanBarcode) {
      throw new AppError("Barcode is required", 400);
    }

    const escapeRegex = (value: string) =>
      value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    const cleanBarcodeLower = cleanBarcode.toLowerCase();

    // Look up the product in the specified branch inventory where barcode matches unitBarcode or config barcode
    const product = await Product.findOne({
      deletedAt: null,
      $and: [
        {
          $or: [
            { branchId: branchId },
            { branch: branchId },
            { [`stock.${branchId}`]: { $exists: true } },
          ],
        },
        {
          $or: [
            {
              unitBarcode: {
                $regex: `^${escapeRegex(cleanBarcode)}$`,
                $options: "i",
              },
            },
            {
              "packaging.configurations.barcode": {
                $regex: `^${escapeRegex(cleanBarcode)}$`,
                $options: "i",
              },
            },
          ],
        },
      ],
    })
      .populate("packaging.configurations.packagingTypeId", "name")
      .lean();

    if (!product) {
      throw new AppError("Unknown barcode", 404);
    }

    // Determine which barcode matched and extract details
    const unitBarcodeLower = product.unitBarcode
      ? String(product.unitBarcode).trim().toLowerCase()
      : "";

    let matched = false;
    let unitValue = 1;
    let label = "Single";
    let packagingConfigIndex: number | undefined;

    if (unitBarcodeLower === cleanBarcodeLower) {
      matched = true;
      unitValue = 1;
      label = "Single";
    } else if (product.packaging?.configurations) {
      for (let i = 0; i < product.packaging.configurations.length; i++) {
        const config = product.packaging.configurations[i];
        if (!config) continue;
        const configBarcodeLower = config.barcode
          ? String(config.barcode).trim().toLowerCase()
          : "";
        if (configBarcodeLower === cleanBarcodeLower) {
          matched = true;
          unitValue = config.unitsPerPackage;
          label =
            typeof config.packagingTypeId === "object" &&
            config.packagingTypeId !== null
              ? (config.packagingTypeId as any).name
              : "Package";
          packagingConfigIndex = i;
          break;
        }
      }
    }

    if (!matched) {
      throw new AppError("Unknown barcode", 404);
    }

    const normalizedProduct = normalizeProductResponse(product, branchId);

    res.status(200).json({
      success: true,
      data: {
        product: normalizedProduct,
        unitValue,
        label,
        ...(packagingConfigIndex !== undefined && { packagingConfigIndex }),
      },
    });
  } catch (error) {
    next(error);
  }
};

export const createProduct = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const payload = await ensureProductSku(mapProductInput(req.body));
    const createdProduct = await Product.create(payload);
    const product = await Product.findById(createdProduct._id).populate(
      "packaging.configurations.packagingTypeId",
      "name",
    );
    if (!product) throw new AppError("Error fetching created product", 500);

    try {
      await import("../audit-logs/auditLog.model.js").then(({ AuditLog }) => {
        return AuditLog.create({
          iconKind: "product",
          title: "Product Added",
          description: `Added product ${product.name}`,
          actorName: req.user
            ? `${req.user.firstName} ${req.user.lastName}`
            : "System",
          occurredAt: new Date(),
          category: "product_added",
          branchId: product.branchId || product.branch,
          metadata: { productId: product._id, sku: product.sku },
        } as any);
      });
    } catch (err) {
      console.error("Failed to create audit log for product creation:", err);
    }

    res.status(201).json({
      success: true,
      data: normalizeProductResponse(product.toObject()),
    });
  } catch (error) {
    next(error);
  }
};

export const updateProduct = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const payload = mapProductInput(req.body);

    // Check old product for price/stock changes if needed, but for now just general update or price override
    const oldProduct = await Product.findById(req.params.id);
    if (!oldProduct) throw new AppError("Product not found", 404);

    const product = await Product.findByIdAndUpdate(req.params.id, payload, {
      new: true,
      runValidators: true,
    }).populate("packaging.configurations.packagingTypeId", "name");
    if (!product) throw new AppError("Product not found", 404);

    try {
      const isPriceChange =
        payload.retail !== undefined && payload.retail !== oldProduct.retail;
      const category = isPriceChange ? "price_override" : "stock_adjustment"; // or just use a general category, but price_override is specifically requested
      const title = isPriceChange ? "Price Override" : "Product Updated";

      await import("../audit-logs/auditLog.model.js").then(({ AuditLog }) => {
        return AuditLog.create({
          iconKind: "product",
          title,
          description: `Updated product ${product.name}${isPriceChange ? ` price to ${product.retail}` : ""}`,
          actorName: req.user
            ? `${req.user.firstName} ${req.user.lastName}`
            : "System",
          occurredAt: new Date(),
          category,
          branchId: product.branchId || product.branch,
          metadata: { productId: product._id, sku: product.sku, payload },
        } as any);
      });
    } catch (err) {
      console.error("Failed to create audit log for product update:", err);
    }

    res.status(200).json({
      success: true,
      data: normalizeProductResponse(product.toObject()),
    });
  } catch (error) {
    next(error);
  }
};

export const deleteProduct = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { deletedAt: new Date() },
      { new: true },
    );
    if (!product) throw new AppError("Product not found", 404);

    try {
      await import("../audit-logs/auditLog.model.js").then(({ AuditLog }) => {
        return AuditLog.create({
          iconKind: "product",
          title: "Product Deleted",
          description: `Deleted product ${product.name}`,
          actorName: req.user
            ? `${req.user.firstName} ${req.user.lastName}`
            : "System",
          occurredAt: new Date(),
          category: "product_added", // Reusing an existing category or you can add product_deleted
          branchId: product.branchId || product.branch,
          metadata: { productId: product._id },
        } as any);
      });
    } catch (err) {
      console.error("Failed to create audit log for product deletion:", err);
    }

    res.status(200).json({ success: true, data: null });
  } catch (error) {
    next(error);
  }
};
