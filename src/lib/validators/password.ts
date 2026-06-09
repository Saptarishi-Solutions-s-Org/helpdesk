import { z } from "zod";
import { passwordPolicySchema } from "@/lib/validators/password-policy";

export const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password required"),
    newPassword: passwordPolicySchema,
    confirmPassword: z.string().min(1, "Confirm password is required"),
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: "New password must be different from current password",
    path: ["newPassword"],
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });
