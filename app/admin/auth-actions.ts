"use server";

import { redirect } from "next/navigation";

import { actionError, toActionState, type ActionState } from "@/lib/actions/result";
import { getAuthAdapter, signIn, signOut } from "@/lib/auth";
import { activity } from "@/lib/cms/repositories/activity";
import { settings } from "@/lib/cms/repositories/settings";
import { users } from "@/lib/cms/repositories/users";
import { credentialsSchema, setupSchema } from "@/schemas/user";

/**
 * Sign in.
 *
 * The same message is returned for an unknown email, a wrong password and a
 * deactivated account, so the form cannot be used to enumerate accounts.
 */
export async function signInAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = credentialsSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return actionError("Enter your email address and password.");
  }

  try {
    const session = await signIn(parsed.data);
    if (!session) {
      return actionError("Those details do not match an active account.");
    }

    await activity.record({
      action: "signed_in",
      entityTitle: session.name,
      userId: session.userId,
      userName: session.name,
    });
  } catch (error) {
    return toActionState(error);
  }

  // `redirect` throws, so it must sit outside the try/catch above.
  const next = formData.get("next");
  redirect(
    typeof next === "string" && next.startsWith("/admin") ? next : "/admin",
  );
}

export async function signOutAction(): Promise<void> {
  await signOut();
  redirect("/admin/login");
}

/**
 * First-run setup: creates the initial super admin.
 *
 * Guarded by a server-side check that no user exists yet, so this cannot be
 * replayed to mint a second super admin once the CMS is live.
 */
export async function setupAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    if (!(await users.isFirstRun())) {
      return actionError("Setup has already been completed. Sign in instead.");
    }

    const parsed = setupSchema.safeParse({
      name: formData.get("name"),
      email: formData.get("email"),
      password: formData.get("password"),
      confirmPassword: formData.get("confirmPassword"),
      siteName: formData.get("siteName"),
    });

    if (!parsed.success) {
      return toActionState(parsed.error);
    }

    const user = await users.create({
      email: parsed.data.email,
      name: parsed.data.name,
      password: parsed.data.password,
      role: "super_admin",
    });

    await settings.update({ siteName: parsed.data.siteName });
    await (await getAuthAdapter()).createSession(user);
  } catch (error) {
    return toActionState(error);
  }

  redirect("/admin");
}
