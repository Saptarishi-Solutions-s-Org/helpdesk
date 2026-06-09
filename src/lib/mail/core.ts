async function getAccessToken() {
  const res = await fetch(
    `https://login.microsoftonline.com/${process.env.TENANT_ID}/oauth2/v2.0/token`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: process.env.CLIENT_ID!,
        client_secret: process.env.CLIENT_SECRET!,
        scope: "https://graph.microsoft.com/.default",
        grant_type: "client_credentials",
      }),
    },
  );

  const data = (await res.json()) as { access_token?: string };
  return data.access_token;
}

export type MailAttachment = {
  name: string;
  contentType: string;
  contentBytes: string;
};

export async function sendMailCore({
  to,
  cc,
  bcc,
  subject,
  html,
  attachments,
}: {
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  html: string;
  attachments?: MailAttachment[];
}) {
  const token = await getAccessToken();
  const microsoftGraphSender =
    process.env.MICROSOFT_GRAPH_SENDER ?? "system.admin@saptarishi.tech";

  const res = await fetch(
    `https://graph.microsoft.com/v1.0/users/${microsoftGraphSender}/sendMail`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: {
          subject,
          body: {
            contentType: "HTML",
            content: html,
          },
          toRecipients: to.map((email) => ({
            emailAddress: { address: email },
          })),
          ccRecipients: (cc || []).map((email) => ({
            emailAddress: { address: email },
          })),
          bccRecipients: (bcc || []).map((email) => ({
            emailAddress: { address: email },
          })),
          attachments: (attachments || []).map((attachment) => ({
            "@odata.type": "#microsoft.graph.fileAttachment",
            name: attachment.name,
            contentType: attachment.contentType,
            contentBytes: attachment.contentBytes,
          })),
        },
      }),
    },
  );

  if (res.status !== 202) {
    throw new Error(await res.text());
  }
}
