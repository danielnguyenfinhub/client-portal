import { Resend } from 'resend'

// Resend is lazy-initialized inside each function

function getResend() {
  return new Resend(process.env.RESEND_API_KEY || 'placeholder')
}

const FROM = process.env.EMAIL_FROM || 'FinHub Portal <onboarding@resend.dev>'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://portal.finhub.net.au'

export async function sendOTPEmail(email: string, code: string, firstName: string) {
  await getResend().emails.send({
    from: FROM,
    to: email,
    subject: `Your FinHub login code: ${code}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #f8fafc; border-radius: 8px;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="color: #1e40af; font-size: 24px; margin: 0;">FinHub</h1>
          <p style="color: #64748b; margin: 4px 0 0;">Client Portal</p>
        </div>
        <div style="background: white; border-radius: 8px; padding: 24px; border: 1px solid #e2e8f0;">
          <p style="margin: 0 0 16px; color: #1e293b;">Hi ${firstName},</p>
          <p style="margin: 0 0 24px; color: #475569;">Your login code is:</p>
          <div style="text-align: center; background: #eff6ff; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
            <span style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #1e40af;">${code}</span>
          </div>
          <p style="margin: 0; color: #64748b; font-size: 14px;">This code expires in 10 minutes. If you didn't request this, please ignore this email.</p>
        </div>
        <p style="text-align: center; color: #94a3b8; font-size: 12px; margin-top: 16px;">FinHub &bull; Your trusted mortgage broker</p>
      </div>
    `,
  })
}

// ─── Broker notification: rate review request ──────────────────────────────

export async function sendRateReviewNotification({
  clientName,
  clientEmail,
  loanId,
  loanName,
  currentRate,
  rateType,
  lender,
  message,
}: {
  clientName: string;
  clientEmail?: string;
  loanId?: string;
  loanName?: string;
  currentRate?: number | null;
  rateType?: string | null;
  lender?: string;
  message?: string;
}) {
  const brokerEmail = process.env.BROKER_EMAIL || 'daniel@finhub.net.au';

  await getResend().emails.send({
    from: FROM,
    to: brokerEmail,
    reply_to: clientEmail || undefined,
    subject: `⚡ Rate Review Request — ${clientName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px; background: #f0f4ff; border-radius: 12px;">
        <div style="text-align:center; margin-bottom:24px;">
          <h1 style="color:#1e40af; font-size:22px; margin:0;">FinHub</h1>
          <p style="color:#64748b; margin:4px 0 0; font-size:13px;">Client Portal — Rate Review Request</p>
        </div>
        <div style="background:white; border-radius:10px; padding:24px; border:1px solid #dbeafe;">
          <p style="font-size:15px; color:#1e293b; margin:0 0 20px;">
            <strong>${clientName}</strong> has submitted a rate review request via the client portal.
          </p>
          <table style="width:100%; border-collapse:collapse; font-size:14px; color:#1e293b;">
            ${clientEmail ? `<tr style="border-bottom:1px solid #f1f5f9;">
              <td style="padding:10px 0; color:#64748b; width:130px;">Email</td>
              <td style="padding:10px 0;"><a href="mailto:${clientEmail}" style="color:#1e40af;">${clientEmail}</a></td>
            </tr>` : ''}
            ${lender ? `<tr style="border-bottom:1px solid #f1f5f9;">
              <td style="padding:10px 0; color:#64748b;">Lender</td>
              <td style="padding:10px 0; font-weight:600;">${lender}</td>
            </tr>` : ''}
            ${currentRate ? `<tr style="border-bottom:1px solid #f1f5f9;">
              <td style="padding:10px 0; color:#64748b;">Current Rate</td>
              <td style="padding:10px 0; font-weight:700; color:#dc2626; font-size:16px;">${currentRate}% p.a. ${rateType ? `(${rateType})` : ''}</td>
            </tr>` : ''}
            ${loanName ? `<tr style="border-bottom:1px solid #f1f5f9;">
              <td style="padding:10px 0; color:#64748b;">Loan</td>
              <td style="padding:10px 0;">${loanName}</td>
            </tr>` : ''}
          </table>
          ${message ? `
            <div style="margin-top:20px; padding:14px 16px; background:#eff6ff; border-radius:8px; border-left:4px solid #1e40af;">
              <p style="margin:0 0 4px; color:#64748b; font-size:12px; text-transform:uppercase; letter-spacing:0.05em;">Client message</p>
              <p style="margin:0; color:#1e293b; font-size:14px; font-style:italic;">"${message}"</p>
            </div>
          ` : ''}
          <div style="margin-top:24px; padding-top:16px; border-top:1px solid #e2e8f0; font-size:13px; color:#94a3b8;">
            <p style="margin:0;">Submitted via FinHub Client Portal • ${new Date().toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
            ${loanId ? `<p style="margin:4px 0 0; font-size:11px;">Mercury Loan ID: ${loanId}</p>` : ''}
          </div>
        </div>
        <p style="text-align:center; color:#94a3b8; font-size:12px; margin-top:16px;">
          Update the rate manually in Mercury CRM after reviewing.
        </p>
      </div>
    `,
  });
}

export async function sendActivationEmail(email: string, token: string, firstName: string) {
  const link = `${APP_URL}/activate?token=${token}`
  await getResend().emails.send({
    from: FROM,
    to: email,
    subject: 'Welcome to your FinHub Client Portal',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #f8fafc; border-radius: 8px;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="color: #1e40af; font-size: 24px; margin: 0;">FinHub</h1>
          <p style="color: #64748b; margin: 4px 0 0;">Client Portal</p>
        </div>
        <div style="background: white; border-radius: 8px; padding: 24px; border: 1px solid #e2e8f0;">
          <p style="margin: 0 0 16px; color: #1e293b;">Hi ${firstName},</p>
          <p style="margin: 0 0 16px; color: #475569;">Welcome to your FinHub Client Portal — your personal window into your mortgage journey.</p>
          <p style="margin: 0 0 24px; color: #475569;">Click below to activate your account and set up your passphrase:</p>
          <div style="text-align: center; margin-bottom: 24px;">
            <a href="${link}" style="display: inline-block; background: #1e40af; color: white; text-decoration: none; padding: 14px 28px; border-radius: 6px; font-weight: bold; font-size: 16px;">
              Activate My Account
            </a>
          </div>
          <p style="margin: 0; color: #64748b; font-size: 14px;">This link expires in 7 days. If you have any questions, contact Daniel at <a href="mailto:daniel@finhub.net.au" style="color: #1e40af;">daniel@finhub.net.au</a>.</p>
        </div>
        <p style="text-align: center; color: #94a3b8; font-size: 12px; margin-top: 16px;">FinHub &bull; Your trusted mortgage broker</p>
      </div>
    `,
  })
}
