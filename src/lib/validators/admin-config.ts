import { z } from "zod";

export const organizationSchema = z.object({
  name: z.string().trim().min(2, "Organization name is required."),
  contactEmail: z
    .string()
    .trim()
    .email("Enter a valid email.")
    .optional()
    .or(z.literal("")),
  contactPhone: z.string().trim().optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
});

export const userSchema = z.object({
  organizationId: z.string().uuid("Organization is required."),
  name: z.string().trim().min(2, "Name is required."),
  email: z.string().trim().email("Enter a valid email."),
  phone: z.string().trim().optional(),
  designation: z.string().trim().optional(),
});

export const userUpdateSchema = userSchema.extend({
  id: z.string().uuid("User is required."),
  status: z.enum(["ACTIVE", "INACTIVE"]),
});

export const projectSchema = z.object({
  name: z.string().trim().min(2, "Project name is required."),
  code: z
    .string()
    .trim()
    .max(30, "Project code must be 30 characters or less.")
    .optional(),
  description: z.string().trim().optional(),
});

export const moduleSchema = z.object({
  projectId: z.string().uuid("Select a project."),
  name: z.string().trim().min(2, "Module name is required."),
  code: z
    .string()
    .trim()
    .max(30, "Module code must be 30 characters or less.")
    .optional(),
  description: z.string().trim().optional(),
});
