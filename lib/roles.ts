export const roleNames = ["ADMIN", "ORDER_MANAGER", "CUTTING_OPERATOR", "FUSING_OPERATOR", "TAILOR", "QC_INSPECTOR", "PACKING_STAFF", "DELIVERY_COORDINATOR"] as const;
export type Role = typeof roleNames[number];
export type RoleUser = { role: string; roles?: unknown };
export const screenNames = ["PRODUCTIVITY"] as const;
export type ScreenAccess = typeof screenNames[number];
export type ScreenUser = RoleUser & { screenAccess?: unknown };
export function userRoles(user: RoleUser): Role[] {
  const stored = user.roles;
  const selected = Array.isArray(stored) ? roleNames.filter(role => stored.includes(role)) : [];
  return selected.length ? selected : roleNames.filter(role => role === user.role);
}
export function hasRole(user: RoleUser, role: string) { return userRoles(user).some(value => value === role); }
export function hasAnyRole(user: RoleUser, roles: readonly string[]) { return userRoles(user).some(role => roles.includes(role)); }
export function primaryRole(roles: readonly Role[]) { return roleNames.find(role => roles.includes(role))!; }
export function userScreens(user: ScreenUser): ScreenAccess[] {
  const stored = user.screenAccess;
  return Array.isArray(stored) ? screenNames.filter(screen => stored.includes(screen)) : [];
}
export function hasScreenAccess(user: ScreenUser, screen: ScreenAccess) {
  return hasAnyRole(user, ["ADMIN", "ORDER_MANAGER"]) || userScreens(user).includes(screen);
}
export function canRespondToLaborCost(user: RoleUser & { id: string }, assignedUserId: string) {
  return user.id === assignedUserId && hasRole(user, "TAILOR");
}

export const stageRoles: Record<string, Role> = { CUTTING: "CUTTING_OPERATOR", FUSING: "FUSING_OPERATOR", STITCHING: "TAILOR", QUALITY_CHECK: "QC_INSPECTOR", PACKING: "PACKING_STAFF", DELIVERY: "DELIVERY_COORDINATOR" };
export function canWorkStage(user: RoleUser & { id: string }, stage: string, assignedUserId?: string | null) {
  return assignedUserId === user.id && !!stageRoles[stage] && hasRole(user, stageRoles[stage]);
}
