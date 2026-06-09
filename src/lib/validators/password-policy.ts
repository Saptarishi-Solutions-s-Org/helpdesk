import { z } from "zod";

export const PASSWORD_POLICY_MESSAGES = {
  required: "Password is required",
  minLength: "Minimum 8 characters",
  uppercase: "Must contain at least one uppercase letter",
  number: "Must contain at least one number",
  special: "Must contain at least one special character",
} as const;

export const passwordPolicySchema = z
  .string()
  .min(1, PASSWORD_POLICY_MESSAGES.required)
  .min(8, PASSWORD_POLICY_MESSAGES.minLength)
  .regex(/[A-Z]/, PASSWORD_POLICY_MESSAGES.uppercase)
  .regex(/[0-9]/, PASSWORD_POLICY_MESSAGES.number)
  .regex(/[^A-Za-z0-9]/, PASSWORD_POLICY_MESSAGES.special);
