const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host:   process.env.SMTP_HOST || 'smtp.gmail.com',
  port:   parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,   // Gmail App Password (16 chars, no spaces)
  },
});

const FROM    = process.env.EMAIL_FROM || `ResearchTrack <${process.env.SMTP_USER}>`;
const APP_URL = process.env.APP_URL    || 'http://localhost:5173';

// Called when workspace owner self-registers
async function sendVerificationEmail(toEmail, name, token) {
  const link = `${APP_URL}/verify-email?token=${token}`;
  await transporter.sendMail({
    from: FROM,
    to:   toEmail,
    subject: 'Verify your ResearchTrack account',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;background:#fff">
        <div style="background:#0d1f17;padding:16px 20px;border-radius:8px 8px 0 0">
          <span style="color:#28e98c;font-size:20px;font-weight:800">ResearchTrack</span>
        </div>
        <div style="border:1px solid #e5e7eb;border-top:none;padding:28px;border-radius:0 0 8px 8px">
          <h2 style="margin:0 0 8px;color:#111827">Welcome, ${name}!</h2>
          <p style="color:#6b7280;margin:0 0 24px">Please verify your email to activate your workspace.</p>
          <a href="${link}"
             style="display:inline-block;background:#4f46e5;color:#fff;padding:12px 28px;
                    border-radius:8px;text-decoration:none;font-weight:600;font-size:15px">
            Verify Email →
          </a>
          <p style="color:#9ca3af;font-size:12px;margin:24px 0 0">
            This link expires in 24 hours. If you did not sign up, ignore this email.
          </p>
        </div>
      </div>`,
  });
}

// Called when user clicks "Forgot Password"
async function sendPasswordResetEmail(toEmail, name, token) {
  const link = `${APP_URL}/reset-password?token=${token}`;
  await transporter.sendMail({
    from: FROM,
    to:   toEmail,
    subject: 'Reset your ResearchTrack password',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;background:#fff">
        <div style="background:#0d1f17;padding:16px 20px;border-radius:8px 8px 0 0">
          <span style="color:#28e98c;font-size:20px;font-weight:800">ResearchTrack</span>
        </div>
        <div style="border:1px solid #e5e7eb;border-top:none;padding:28px;border-radius:0 0 8px 8px">
          <h2 style="margin:0 0 8px;color:#111827">Password Reset</h2>
          <p style="color:#6b7280;margin:0 0 4px">Hi ${name},</p>
          <p style="color:#6b7280;margin:0 0 24px">
            Click below to reset your password. This link expires in <strong>1 hour</strong>.
          </p>
          <a href="${link}"
             style="display:inline-block;background:#4f46e5;color:#fff;padding:12px 28px;
                    border-radius:8px;text-decoration:none;font-weight:600;font-size:15px">
            Reset Password →
          </a>
          <p style="color:#9ca3af;font-size:12px;margin:24px 0 0">
            If you did not request this, ignore this email. Your password will not change.
          </p>
        </div>
      </div>`,
  });
}

const EMAIL_ENABLED = !!(process.env.SMTP_USER && process.env.SMTP_PASS);

module.exports = { sendVerificationEmail, sendPasswordResetEmail, EMAIL_ENABLED };
