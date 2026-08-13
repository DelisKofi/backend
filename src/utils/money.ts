export const roundToCents = (value: number) =>
  Math.round((value + Number.EPSILON) * 100) / 100;
