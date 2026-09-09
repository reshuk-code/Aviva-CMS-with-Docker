"use server";

import { revalidatePath } from "next/cache";

import {
  actionError,
  actionSuccess,
  formBoolean,
  formString,
  toActionState,
  type ActionState,
} from "@/lib/actions/result";
import { requirePermission, requireSession } from "@/lib/auth";
import { users } from "@/lib/cms/repositories/users";
import { changePasswordSchema, createUserSchema, userInputSchema } from "@/schemas/user";
import { verifyPassword } from "@/lib/auth/password";

/**
 * User management.
 *
 * Two rules are enforced here and nowhere else, because the UI is not a
 * security boundary:
 *   - only a super admin may set or change a role
 *   - nobody may lock themselves out by demoting or deactivating themselves
 */
export async function createUserAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const session = await requirePermission("users.create");

    const parsed = createUserSchema.safeParse({
      email: formString(formData.get("email")),
      name: formString(formData.get("name")),
      role: formString(formData.get("role")) || "viewer",
      password: formString(formData.get("password")),
      active: formBoolean(formData.get("active")),
      avatar: formString(formData.get("avatar")),
    });

    if (!parsed.success) return toActionState(parsed.error);

    if (parsed.data.role === "super_admin" && session.role !== "super_admin") {
      return actionError("Only a super admin can create another super admin.");
    }

    await users.create({
      email: parsed.data.email,
      name: parsed.data.name,
      password: parsed.data.password,
      role: parsed.data.role,
      active: parsed.data.active,
      avatar: parsed.data.avatar,
    });

    revalidatePath("/admin/users");
    return actionSuccess("User created.");
  } catch (error) {
    return toActionState(error);
  }
}

export async function updateUserAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const session = await requirePermission("users.update");
    const id = formString(formData.get("id"));
    if (!id) return actionError("Missing user id.");

    const parsed = userInputSchema.safeParse({
      email: formString(formData.get("email")),
      name: formString(formData.get("name")),
      role: formString(formData.get("role")) || "viewer",
      active: formBoolean(formData.get("active")),
      avatar: formString(formData.get("avatar")),
    });

    if (!parsed.success) return toActionState(parsed.error);

    const target = await users.get(id);
    if (!target) return actionError("That user no longer exists.");

    const roleChanged = target.role !== parsed.data.role;

    if (roleChanged && session.role !== "super_admin") {
      return actionError("Only a super admin can change roles.");
    }

    if (id === session.userId) {
      if (roleChanged) {
        return actionError(
          "You cannot change your own role. Ask another super admin.",
        );
      }
      if (!parsed.data.active) {
        return actionError("You cannot deactivate your own account.");
      }
    }

    // Removing the last super admin would leave nobody able to restore one.
    if (target.role === "super_admin" && parsed.data.role !== "super_admin") {
      if ((await users.countByRole("super_admin")) <= 1) {
        return actionError(
          "This is the only super admin. Promote someone else first.",
        );
      }
    }

    await users.update(id, parsed.data);

    revalidatePath("/admin/users");
    return actionSuccess("User updated.");
  } catch (error) {
    return toActionState(error);
  }
}

export async function deleteUserAction(id: string): Promise<ActionState> {
  try {
    const session = await requirePermission("users.delete");

    if (id === session.userId) {
      return actionError("You cannot delete your own account.");
    }

    const removed = await users.delete(id);
    if (!removed) return actionError("That user no longer exists.");

    revalidatePath("/admin/users");
    return actionSuccess("User deleted.");
  } catch (error) {
    return toActionState(error);
  }
}

export async function setUserPasswordAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const session = await requirePermission("users.update");
    const id = formString(formData.get("id"));
    const password = formString(formData.get("password"));

    if (!id) return actionError("Missing user id.");
    if (password.length < 10) {
      return actionError("Use at least 10 characters.", {
        password: ["Use at least 10 characters."],
      });
    }

    if (session.role !== "super_admin" && id !== session.userId) {
      return actionError("Only a super admin can reset another user's password.");
    }

    await users.setPassword(id, password);
    return actionSuccess("Password updated.");
  } catch (error) {
    return toActionState(error);
  }
}

/** Self-service password change: requires the current password. */
export async function changeOwnPasswordAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const session = await requireSession();

    const parsed = changePasswordSchema.safeParse({
      currentPassword: formString(formData.get("currentPassword")),
      newPassword: formString(formData.get("newPassword")),
      confirmPassword: formString(formData.get("confirmPassword")),
    });

    if (!parsed.success) return toActionState(parsed.error);

    const stored = await users.findByEmailWithSecret(session.email);
    if (
      !stored ||
      !(await verifyPassword(parsed.data.currentPassword, stored.passwordHash))
    ) {
      return actionError("Your current password is not correct.", {
        currentPassword: ["Your current password is not correct."],
      });
    }

    await users.setPassword(session.userId, parsed.data.newPassword);
    return actionSuccess("Password changed.");
  } catch (error) {
    return toActionState(error);
  }
}
