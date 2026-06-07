export function renderBrandedEmail({ bodyHtml }: { bodyHtml: string }): string {
  return `<!DOCTYPE html>
<html>
<body style="font-family:Arial,sans-serif;background:#f8fafc;margin:0;padding:20px;">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:8px;padding:32px;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
    <h1 style="margin:0 0 24px;font-family:Arial,sans-serif;font-size:22px;line-height:1.2;font-weight:600;">
      <span style="color:#4f46e5;">Plan</span><span style="color:#f59e0b;">IQ</span>
    </h1>
    ${bodyHtml}
  </div>
</body>
</html>`
}
