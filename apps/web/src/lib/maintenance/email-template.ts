export interface MaintenanceEmailParams {
  recipientName: string;
  startTime: Date;
  endTime: Date;
  estimatedMinutes: number;
  message: string;
}

export function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function toSafeString(value: string | number | Date): string {
  if (value instanceof Date) {
    return escapeHtml(value.toISOString());
  }

  return escapeHtml(String(value));
}

export function buildMaintenanceEmailHtml(params: MaintenanceEmailParams): string {
  const recipientName = toSafeString(params.recipientName);
  const startTime = toSafeString(params.startTime);
  const endTime = toSafeString(params.endTime);
  const estimatedMinutes = toSafeString(params.estimatedMinutes);
  const message = toSafeString(params.message);

  return `
<!doctype html>
<html lang="en">
  <body style="margin:0;padding:0;background:#f8fafc;font-family:Arial,sans-serif;color:#0f172a;line-height:1.5;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:24px;">
      <tr>
        <td align="center">
          <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width:600px;background:#ffffff;border:1px solid #e2e8f0;border-radius:10px;padding:24px;">
            <tr><td style="font-size:24px;font-weight:700;padding-bottom:12px;">Scheduled maintenance</td></tr>
            <tr><td style="padding-bottom:12px;">Hi ${recipientName},</td></tr>
            <tr><td style="padding-bottom:16px;">${message}</td></tr>
            <tr><td style="padding-bottom:8px;"><strong>Start:</strong> ${startTime}</td></tr>
            <tr><td style="padding-bottom:8px;"><strong>End:</strong> ${endTime}</td></tr>
            <tr><td style="padding-bottom:16px;"><strong>Estimated duration:</strong> ${estimatedMinutes} minutes</td></tr>
            <tr><td style="font-size:12px;color:#475569;">Thank you for your patience and understanding.</td></tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`.trim();
}

export function buildMaintenanceEmailText(params: MaintenanceEmailParams): string {
  const recipientName = toSafeString(params.recipientName);
  const startTime = toSafeString(params.startTime);
  const endTime = toSafeString(params.endTime);
  const estimatedMinutes = toSafeString(params.estimatedMinutes);
  const message = toSafeString(params.message);

  return [
    'Scheduled maintenance',
    '',
    `Hi ${recipientName},`,
    '',
    message,
    '',
    `Start: ${startTime}`,
    `End: ${endTime}`,
    `Estimated duration: ${estimatedMinutes} minutes`,
    '',
    'Thank you for your patience and understanding.',
  ].join('\n');
}
