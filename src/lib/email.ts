import { Resend } from "resend";

const apiKey = process.env.RESEND_API_KEY;
const fromEmail = process.env.EMAIL_FROM;

const resend = apiKey ? new Resend(apiKey) : null;

async function sendEmail(to: string, subject: string, html: string, text: string) {
  if (!resend || !fromEmail) {
    throw new Error("RESEND_API_KEY and EMAIL_FROM must be set in .env");
  }
  const { error } = await resend.emails.send({ to: [to], from: fromEmail, subject, html, text });
  if (error) {
    throw new Error(`Resend failed to send email: ${error.message}`);
  }
}

// Plain inline-styled HTML — email clients don't run Tailwind, so the
// "Periwinkle" palette values are hardcoded here to match the app's look.
function wrapEmail(bodyHtml: string): string {
  return `
  <div style="font-family: Arial, Helvetica, sans-serif; background:#EDE8F5; padding:32px 0;">
    <div style="max-width:480px; margin:0 auto; background:#ffffff; border:1px solid #DCE1F5; border-radius:16px; padding:32px;">
      <p style="font-weight:800; font-size:16px; color:#2A2F55; margin:0 0 24px;">Musketeer Tech</p>
      ${bodyHtml}
      <p style="font-size:12px; color:#6B6F9E; margin-top:32px;">Intern Management Platform</p>
    </div>
  </div>`;
}

export async function sendPasswordResetEmail(to: string, resetUrl: string) {
  const html = wrapEmail(`
    <h1 style="font-size:20px; color:#2A2F55; margin:0 0 12px;">Reset your password</h1>
    <p style="font-size:14px; color:#2A2F55; line-height:1.5;">We received a request to reset the password on your account. This link expires in 30 minutes and can only be used once.</p>
    <p style="margin:24px 0;">
      <a href="${resetUrl}" style="background:#3D52A0; color:#ffffff; text-decoration:none; padding:10px 20px; border-radius:8px; font-size:14px; font-weight:600; display:inline-block;">Reset password</a>
    </p>
    <p style="font-size:12px; color:#6B6F9E; line-height:1.5;">If you didn't request this, you can safely ignore this email — your password won't change.</p>
  `);
  const text = `Reset your password: ${resetUrl}\n\nThis link expires in 30 minutes. If you didn't request this, ignore this email.`;
  await sendEmail(to, "Reset your password", html, text);
}

export async function sendMagicLoginEmail(to: string, loginUrl: string) {
  const html = wrapEmail(`
    <h1 style="font-size:20px; color:#2A2F55; margin:0 0 12px;">Sign in to your account</h1>
    <p style="font-size:14px; color:#2A2F55; line-height:1.5;">Click below to sign in. This link expires in 15 minutes and can only be used once.</p>
    <p style="margin:24px 0;">
      <a href="${loginUrl}" style="background:#3D52A0; color:#ffffff; text-decoration:none; padding:10px 20px; border-radius:8px; font-size:14px; font-weight:600; display:inline-block;">Sign in</a>
    </p>
    <p style="font-size:12px; color:#6B6F9E; line-height:1.5;">If you didn't request this, you can safely ignore this email.</p>
  `);
  const text = `Sign in: ${loginUrl}\n\nThis link expires in 15 minutes and can only be used once. If you didn't request this, ignore this email.`;
  await sendEmail(to, "Your sign-in link", html, text);
}
