/**
 * Login / social-login responses: when the server adds a role to an existing
 * account it sends the new role/active_mode on `data` itself, and multi-role
 * accounts may come back joined ("business, customer"). Returns the response
 * data with `user.role` as one role (business > staff > customer).
 */
export function withSingleRole<
  T extends {
    user?: any;
    role?: string;
    active_mode?: string | null;
  },
>(data: T): T {
  if (!data?.user) return data;
  const roles = String(data.role || data.user.role || "")
    .toLowerCase()
    .split(",")
    .map((r) => r.trim());
  const role = roles.includes("business")
    ? "business"
    : roles.includes("staff")
      ? "staff"
      : roles[0];
  return {
    ...data,
    user: {
      ...data.user,
      role,
      active_mode:
        data.active_mode !== undefined
          ? data.active_mode
          : data.user.active_mode,
    },
  };
}
