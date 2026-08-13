/**
 * Default password for admin-created or admin-reset users.
 * Same algorithm as POST /api/v1/admin/users (create user).
 */
export const generateDefaultPassword = (): string =>
  `Retail@${Math.floor(1000 + Math.random() * 9000)}`;
