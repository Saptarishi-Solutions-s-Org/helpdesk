import { z } from "zod";

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
