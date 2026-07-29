import { Resend } from "resend";

export async function sendOtpEmail(code: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.ADMIN_EMAIL;

  if (!apiKey || !to) {
    throw new Error("RESEND_API_KEY or ADMIN_EMAIL is not set");
  }

  const resend = new Resend(apiKey);
  const from = process.env.RESEND_FROM_EMAIL || "Portfolio Admin <onboarding@resend.dev>";

  const { error } = await resend.emails.send({
    from,
    to,
    subject: `Your admin login code: ${code}`,
    html: `
      <div style="font-family: sans-serif; max-width: 400px;">
        <p>Your admin login code is:</p>
        <p style="font-size: 32px; font-weight: bold; letter-spacing: 6px;">${code}</p>
        <p style="color: #666; font-size: 13px;">This code expires in 5 minutes. If you didn't request this, you can ignore this email.</p>
      </div>
    `,
  });

  if (error) {
    throw new Error(`Failed to send OTP email: ${error.message}`);
  }
}
