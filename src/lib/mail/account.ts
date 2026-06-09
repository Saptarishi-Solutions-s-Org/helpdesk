import { baseEmailTemplate } from "@/lib/mail/template";
import { sendDynamicMail } from "@/lib/mail/send";

export async function sendSetPasswordMail({
  to,
  name,
  link,
}: {
  to: string;
  name: string;
  link: string;
}) {
  const html = baseEmailTemplate({
    title: "Set your SRS Helpdesk password",
    content: `
      <p style="margin:0 0 10px;">Dear ${name},</p>
      <p style="margin:0 0 10px;">Your SRS Helpdesk account has been created.</p>
      <p style="margin:0 0 16px;">Please set your password using the secure link below.</p>
      <p style="margin:0 0 16px;"><a href="${link}" style="color:#2563eb;text-decoration:none;word-break:break-all;">${link}</a></p>
      <p style="margin:0;">Best regards,<br/><strong>SRS Support Team</strong></p>
    `,
  });

  await sendDynamicMail({
    to: [to],
    subject: "Set your SRS Helpdesk password",
    content: html,
    sender: "SRS Helpdesk System",
    isRaw: true,
  });
}

export async function sendForgotPasswordMail({
  to,
  name,
  link,
}: {
  to: string;
  name: string;
  link: string;
}) {
  const html = baseEmailTemplate({
    title: "Reset your SRS Helpdesk password",
    content: `
      <p style="margin:0 0 10px;">Dear ${name},</p>
      <p style="margin:0 0 10px;">We received a request to reset your SRS Helpdesk password.</p>
      <p style="margin:0 0 16px;">This link expires in 30 minutes.</p>
      <p style="margin:0 0 16px;"><a href="${link}" style="color:#2563eb;text-decoration:none;word-break:break-all;">${link}</a></p>
      <p style="margin:0;">If this was not you, please ignore this email.</p>
    `,
  });

  await sendDynamicMail({
    to: [to],
    subject: "Reset your SRS Helpdesk password",
    content: html,
    sender: "SRS Helpdesk System",
    isRaw: true,
  });
}
