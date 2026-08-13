export type DedupeMatchReason = 'name' | 'barcode' | 'both';

export const DEDUPE_DEFAULT_LIMIT = 20;
export const DEDUPE_MAX_LIMIT = 50;

export type DedupeSearchInput = {
  name?: string | undefined;
  barcode?: string | undefined;
};

export const parseDedupeSearchFlag = (value: unknown): boolean => {
  if (value === true || value === 'true' || value === '1') return true;
  return false;
};

export const parseDedupeLimit = (raw: unknown): number => {
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return DEDUPE_DEFAULT_LIMIT;
  }
  return Math.min(Math.floor(parsed), DEDUPE_MAX_LIMIT);
};

export const normalizeBarcode = (barcode: string): string => barcode.trim();

const escapeRegex = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const buildBarcodeMatchClause = (barcode: string) => {
  const normalized = normalizeBarcode(barcode);
  const pattern = `^${escapeRegex(normalized)}$`;
  return {
    $or: [
      { unitBarcode: { $regex: pattern, $options: 'i' } },
      { 'packaging.configurations.barcode': { $regex: pattern, $options: 'i' } },
    ],
  };
};

export const buildDedupeQuery = (
  input: DedupeSearchInput
): { query: Record<string, unknown>; matchReason: DedupeMatchReason } | null => {
  const name = typeof input.name === 'string' ? input.name.trim() : '';
  const barcode = typeof input.barcode === 'string' ? input.barcode.trim() : '';

  if (!name && !barcode) {
    return null;
  }

  if (name && barcode) {
    return {
      query: {
        deletedAt: null,
        $and: [{ name: { $regex: name, $options: 'i' } }, buildBarcodeMatchClause(barcode)],
      },
      matchReason: 'both',
    };
  }

  if (name) {
    return {
      query: {
        deletedAt: null,
        name: { $regex: name, $options: 'i' },
      },
      matchReason: 'name',
    };
  }

  return {
    query: {
      deletedAt: null,
      ...buildBarcodeMatchClause(barcode),
    },
    matchReason: 'barcode',
  };
};

export const getLinkedBranchIds = (stock: unknown): string[] => {
  if (!stock || typeof stock !== 'object') {
    return [];
  }
  return Object.keys(stock as Record<string, unknown>);
};

export const isBranchLinked = (stock: unknown, branchId: string): boolean => {
  if (!stock || typeof stock !== 'object') {
    return false;
  }
  return Object.prototype.hasOwnProperty.call(stock, branchId);
};

export const toDedupeCandidate = (
  product: Record<string, unknown>,
  matchReason: DedupeMatchReason
) => {
  const packaging = product.packaging as
    | {
        enabled?: boolean;
        configurations?: Array<Record<string, unknown>>;
      }
    | undefined;

  let normalizedPackaging = packaging;
  if (packaging?.configurations) {
    normalizedPackaging = {
      ...packaging,
      configurations: packaging.configurations.map((config) => {
        let packagingTypeId = config.packagingTypeId;
        let packagingTypeName: string | undefined;

        if (typeof packagingTypeId === 'object' && packagingTypeId !== null) {
          const typed = packagingTypeId as { name?: string; _id?: string; id?: string };
          packagingTypeName = typed.name;
          packagingTypeId = typed._id || typed.id;
        }

        return {
          ...config,
          packagingTypeId,
          packagingTypeName,
        };
      }),
    };
  }

  return {
    _id: product._id,
    name: product.name,
    sku: product.sku,
    category: product.category,
    retail: product.retail,
    unitBarcode: product.unitBarcode ?? '',
    imageUrl: product.imageUrl,
    packaging: normalizedPackaging,
    linkedBranchIds: getLinkedBranchIds(product.stock),
    matchReason,
  };
};
