const adminEnv = process.env.NEXT_PUBLIC_ADMIN_ACCOUNTS ?? '';

export const ADMIN_ACCOUNTS = adminEnv
  .split(',')
  .map((value) => value.trim().toLowerCase())
  .filter(Boolean);

export function isAdminAccount(address?: string | null) {
  if (!address) return false;
  return ADMIN_ACCOUNTS.includes(address.toLowerCase());
}
