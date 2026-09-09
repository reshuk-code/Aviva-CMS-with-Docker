import "server-only";

import { ConflictError, NotFoundError } from "@/lib/cms/errors";
import { getDatabase } from "@/lib/database";
import { hashPassword } from "@/lib/auth/password";
import type { ListOptions, Paginated } from "@/types/common";
import type { CmsUser, Role, StoredUser } from "@/types/user";

import { buildListQuery } from "./base";

const SEARCH_FIELDS = ["name", "email"];

async function collection() {
  return (await getDatabase()).collection<StoredUser>("users");
}

/** Strips credential material before a user record leaves the auth layer. */
export function toPublicUser(user: StoredUser): CmsUser {
  const { passwordHash: _passwordHash, ...rest } = user;
  return rest;
}

/**
 * Users repository.
 *
 * `passwordHash` never escapes this module except through
 * `findByEmailWithSecret`, which exists solely for the credentials auth
 * adapter. Every other method returns a `CmsUser`.
 */
export const users = {
  async list(options?: ListOptions): Promise<Paginated<CmsUser>> {
    const store = await collection();
    const page = await store.list({
      ...buildListQuery(options, SEARCH_FIELDS),
      // Users have no editorial status; buildListQuery would filter on it.
      where: undefined,
    });

    return { ...page, items: page.items.map(toPublicUser) };
  },

  async get(id: string): Promise<CmsUser | null> {
    const user = await (await collection()).findById(id);
    return user ? toPublicUser(user) : null;
  },

  async findByEmail(email: string): Promise<CmsUser | null> {
    const user = await this.findByEmailWithSecret(email);
    return user ? toPublicUser(user) : null;
  },

  /** Auth-only. Callers must not return the result to a client. */
  async findByEmailWithSecret(email: string): Promise<StoredUser | null> {
    const store = await collection();
    return store.findOne({
      where: [
        { field: "email", op: "eq", value: email.trim().toLowerCase() },
      ],
    });
  },

  async count(): Promise<number> {
    return (await collection()).count();
  },

  /** True before the first user exists, which triggers the setup screen. */
  async isFirstRun(): Promise<boolean> {
    return (await this.count()) === 0;
  },

  async create(input: {
    email: string;
    name: string;
    password: string;
    role: Role;
    active?: boolean;
    avatar?: string | null;
  }): Promise<CmsUser> {
    const store = await collection();
    const email = input.email.trim().toLowerCase();

    if (await this.findByEmailWithSecret(email)) {
      throw new ConflictError(
        "An account with that email address already exists.",
        "email",
      );
    }

    const created = await store.create({
      email,
      name: input.name.trim(),
      role: input.role,
      avatar: input.avatar ?? null,
      active: input.active ?? true,
      lastLoginAt: null,
      extraPermissions: [],
      passwordHash: await hashPassword(input.password),
    });

    return toPublicUser(created);
  },

  async update(
    id: string,
    patch: {
      email?: string;
      name?: string;
      role?: Role;
      active?: boolean;
      avatar?: string | null;
    },
  ): Promise<CmsUser> {
    const store = await collection();
    const existing = await store.findById(id);
    if (!existing) throw new NotFoundError("User");

    if (patch.email) {
      const email = patch.email.trim().toLowerCase();
      const clash = await this.findByEmailWithSecret(email);
      if (clash && clash.id !== id) {
        throw new ConflictError(
          "An account with that email address already exists.",
          "email",
        );
      }
      patch = { ...patch, email };
    }

    const updated = await store.update(id, patch);
    if (!updated) throw new NotFoundError("User");
    return toPublicUser(updated);
  },

  async setPassword(id: string, password: string): Promise<void> {
    const store = await collection();
    const updated = await store.update(id, {
      passwordHash: await hashPassword(password),
    });
    if (!updated) throw new NotFoundError("User");
  },

  async recordLogin(id: string): Promise<void> {
    const store = await collection();
    await store.update(id, { lastLoginAt: new Date().toISOString() });
  },

  /**
   * Deleting the last super admin would lock everyone out, so it is refused.
   * The same guard applies to demoting oneself in the users server actions.
   */
  async delete(id: string): Promise<boolean> {
    const store = await collection();
    const existing = await store.findById(id);
    if (!existing) return false;

    if (existing.role === "super_admin") {
      const superAdmins = await store.count({
        where: [{ field: "role", op: "eq", value: "super_admin" }],
      });
      if (superAdmins <= 1) {
        throw new ConflictError(
          "This is the only super admin. Promote another user first.",
        );
      }
    }

    return store.delete(id);
  },

  async countByRole(role: Role): Promise<number> {
    const store = await collection();
    return store.count({ where: [{ field: "role", op: "eq", value: role }] });
  },
};
