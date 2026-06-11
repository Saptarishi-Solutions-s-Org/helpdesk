import { z } from "zod";

const shortCodeSchema = z
  .string()
  .trim()
  .min(2, "Short code must be 2 to 3 characters.")
  .max(3, "Short code must be 2 to 3 characters.")
  .regex(/^[A-Za-z0-9]+$/, "Short code can contain only letters and numbers.")
  .transform((value) => value.toUpperCase());

export const organizationSchema = z.object({
  name: z.string().trim().min(2, "Organization name is required."),
  shortCode: shortCodeSchema,
  contactEmail: z
    .string()
    .trim()
    .email("Enter a valid email.")
    .optional()
    .or(z.literal("")),
  contactPhone: z.string().trim().optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
});

export const organizationProjectLinkSchema = z.object({
  projectIds: z.array(z.string().uuid("Select a valid project.")).min(1, "Select at least one project."),
});

export const userSchema = z.object({
  organizationId: z.string().uuid("Organization is required."),
  name: z.string().trim().min(2, "Name is required."),
  email: z.string().trim().email("Enter a valid email."),
  phone: z.string().trim().optional(),
  designation: z.string().trim().optional(),
});

export const userUpdateSchema = userSchema.extend({
  id: z.string().uuid("Client is required."),
  status: z.enum(["ACTIVE", "INACTIVE"]),
});

export const projectSchema = z.object({
  name: z.string().trim().min(2, "Project name is required."),
  shortCode: shortCodeSchema,
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

export const internalUserSchema = z.object({
  name: z.string().trim().min(2, "Name is required."),
  email: z.string().trim().email("Enter a valid email."),
  phone: z.string().trim().optional(),
  designation: z.string().trim().optional(),
  roleName: z.enum(["DEVELOPER", "QUALITY ANALYST"], { message: "Select an internal role." }),
});
