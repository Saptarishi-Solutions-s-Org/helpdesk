import { sendMailCore, type MailAttachment } from "@/lib/mail/core";
import { wrapEmail } from "@/lib/mail/template";

export async function sendDynamicMail({
  to,
  cc,
  bcc,
  subject,
  content,
  sender = "SRS Helpdesk System",
  isRaw,
  attachments,
}: {
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  content: string;
  sender?: string;
  isRaw?: boolean;
  attachments?: MailAttachment[];
}) {
  const html = isRaw
    ? content
    : wrapEmail({
        content,
        sender,
      });

  await sendMailCore({
    to,
    cc,
    bcc,
    subject,
    html,
    attachments,
  });
}
