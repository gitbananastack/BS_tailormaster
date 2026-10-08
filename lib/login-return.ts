export function loginReturnPath(value: unknown): string {
  return typeof value === "string" && /^\/orders\/[a-zA-Z0-9_-]+(?:\/status)?(?:#update)?$/.test(value) ? value : "/";
}
