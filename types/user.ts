import type { BaseRecord, ID } from "./common";

/**
 * Roles, ordered from most to least privileged.
 * A role is a named bundle of permissions (see lib/auth/permissions.ts).
 */
export const ROLES = [
  "super_admin",
  "admin",
  "editor",
  "author",
  "viewer",
] as const;

export type Role = (typeof ROLES)[number];

/**
 * Permissions are `<resource>.<action>` strings so new resources can be added
 * without changing the auth core.
 */
export type PermissionAction = "read" | "create" | "update" | "delete" | "publish";

export type Permission = `${string}.${PermissionAction}` | "*";

export interface CmsUser extends BaseRecord {
  email: string;
  name: string;
  role: Role;
  avatar: string | null;
  active: boolean;
  lastLoginAt: string | null;
  /** Permissions granted on top of the role's defaults. */
  extraPermissions: Permission[];
}

/** A user record as stored, including the credential material. */
export interface StoredUser extends CmsUser {
  /** scrypt hash; never leaves the server. See lib/auth/password.ts. */
  passwordHash: string | null;
}

/** The authenticated principal available to server code. */
export interface Session {
  userId: ID;
  email: string;
  name: string;
  role: Role;
  /** Unix seconds. */
  expiresAt: number;
}
