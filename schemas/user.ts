import { z } from "zod";

import { ROLES } from "@/types/user";

import { optionalUrl } from "./common";

export const roleSchema = z.enum(ROLES);

/**
 * Password policy. Deliberately modest: a long minimum beats an unmemorable
 * character-class rule, and this is an admin panel for a small team, not a
 * consumer product.
 */
export const passwordSchema = z
  .string()
  .min(10, "Use at least 10 characters.")
  .max(200, "That password is too long.");

export const credentialsSchema = z.object({
  email: z.email("Enter a valid email address.").trim().toLowerCase(),
  password: z.string().min(1, "Password is required."),
});

export const userInputSchema = z.object({
  email: z.email("Enter a valid email address.").trim().toLowerCase(),
  name: z.string().trim().min(1, "Name is required.").max(120),
  role: roleSchema.default("viewer"),
  avatar: optionalUrl,
  active: z.coerce.boolean().default(true),
});

export const createUserSchema = userInputSchema.extend({
  password: passwordSchema,
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password."),
    newPassword: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((value) => value.newPassword === value.confirmPassword, {
    path: ["confirmPassword"],
    message: "The two passwords do not match.",
  });

/** First-run setup: creates the initial super admin. */
export const setupSchema = z
  .object({
    name: z.string().trim().min(1, "Name is required."),
    email: z.email("Enter a valid email address.").trim().toLowerCase(),
    password: passwordSchema,
    confirmPassword: z.string(),
    siteName: z.string().trim().min(1, "Site name is required."),
  })
  .refine((value) => value.password === value.confirmPassword, {
    path: ["confirmPassword"],
    message: "The two passwords do not match.",
  });

export type UserInput = z.input<typeof userInputSchema>;
export type CreateUserInput = z.input<typeof createUserSchema>;
export type SetupInput = z.input<typeof setupSchema>;
