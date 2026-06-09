export function baseEmailTemplate({
  title,
  content,
}: {
  title: string;
  content: string;
}) {
  const logoUrl = getEmailAssetUrl("/saptarishi.png");
  const securityUrl = getEmailAssetUrl("/security.png");

  return `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8" />
<title>${title}</title>
</head>
<body style="margin:0; padding:0; background-color:#ffffff; font-family:Arial, Helvetica, sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0">
<tr>
<td align="center">
<table width="600" cellpadding="0" cellspacing="0">
<tr>
<td align="center" style="padding:22px 0 8px;">
<img src="${logoUrl}" width="160" alt="Saptarishi Solutions" style="display:block;" />
</td>
</tr>
<tr>
<td align="center" style="padding:8px 0 10px;">
<h2 style="margin:0; color:#111827;">${title}</h2>
</td>
</tr>
<tr>
<td style="border-top:6px solid #7c83ff;"></td>
</tr>
<tr>
<td align="center" style="padding:22px 0;">
<img src="${securityUrl}" width="110" alt="Security" style="display:block;" />
</td>
</tr>
<tr>
<td style="padding:0 32px 28px; color:#374151; font-size:15px; line-height:1.55;">
${content}
</td>
</tr>
<tr>
<td align="center" style="background-color:#7c83ff; padding:14px; color:#ffffff; font-size:13px;">
© ${new Date().getFullYear()} SRS Helpdesk Saptarishi Solutions PVT LTD. All rights reserved.
</td>
</tr>
</table>
</td>
</tr>
</table>
</body>
</html>
`;
}

export function wrapEmail({ content, sender }: { content: string; sender: string }) {
  return baseEmailTemplate({
    title: "SRS Helpdesk",
    content: `${content}<p style="margin:18px 0 0;">Regards,<br/><strong>${sender}</strong></p>`,
  });
}

export function getEmailAssetUrl(path: string) {
  const baseUrl = process.env.EMAIL_ASSET_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || "";
  return `${baseUrl}${path}`;
}
