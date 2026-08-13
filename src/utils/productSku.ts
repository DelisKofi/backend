const SKU_PREFIX_MAX_LENGTH = 12;
const SKU_SUFFIX_LENGTH = 6;

const normalizeSkuSegment = (value: string) =>
  value
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-+/g, '-');

const randomSkuSuffix = () => {
  const alphabet = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let suffix = '';

  for (let i = 0; i < SKU_SUFFIX_LENGTH; i += 1) {
    const index = Math.floor(Math.random() * alphabet.length);
    suffix += alphabet[index];
  }

  return suffix;
};

export const buildSkuPrefix = (name: string) => {
  const normalized = normalizeSkuSegment(name) || 'PRODUCT';
  return normalized.slice(0, SKU_PREFIX_MAX_LENGTH);
};

export const generateProductSku = (name: string) => {
  const prefix = buildSkuPrefix(name);
  return `${prefix}-${randomSkuSuffix()}`;
};

export const isSystemGeneratedSku = (sku: string) =>
  /^[A-Z0-9]+(?:-[A-Z0-9]+)+$/.test(sku.trim().toUpperCase());

export const normalizeSkuForComparison = (sku: string) => sku.trim().toUpperCase();
