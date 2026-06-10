import { z } from "zod";

export function richTextToPlainText(value: string) {
  return value
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

export const createIssueSchema = z.object({
  title: z.string().trim().min(1, "Title is required.").max(220, "Title must be 220 characters or less."),
  description: z
    .string()
    .min(1, "Description is required.")
    .refine((value) => richTextToPlainText(value).length > 0, "Description is required."),
});

export const attachmentLinkSchema = z.object({
  url: z.string().trim().url("Enter a valid attachment link."),
  label: z.string().trim().max(120, "Label must be 120 characters or less.").optional(),
});

export const commentSchema = z.object({
  body: z
    .string()
    .min(1, "Comment is required.")
    .refine((value) => richTextToPlainText(value).length > 0, "Comment is required."),
  attachmentUrl: z.string().trim().url("Enter a valid attachment link.").optional().or(z.literal("")),
  attachmentLabel: z.string().trim().max(120, "Label must be 120 characters or less.").optional(),
});
