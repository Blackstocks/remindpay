import nodemailer from 'nodemailer';

// Create reusable transporter
function createTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: EmailOptions) {
  try {
    const transporter = createTransporter();
    await transporter.sendMail({
      from: process.env.EMAIL_FROM || 'ReminderApp <noreply@reminder.app>',
      to,
      subject,
      html,
    });
    return { success: true };
  } catch (error) {
    console.error('Email send failed:', error);
    return { success: false, error };
  }
}

// ─── EMAIL TEMPLATES ─────────────────────────────────────────

export function reminderEmailTemplate(data: {
  userName: string;
  title: string;
  description?: string;
  dateTime: string;
  category: string;
  priority: string;
}) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
      <div style="max-width:600px;margin:0 auto;padding:20px;">
        <div style="background:linear-gradient(135deg,#3b82f6,#2563eb);border-radius:16px 16px 0 0;padding:30px;text-align:center;">
          <h1 style="color:#fff;margin:0;font-size:24px;">Reminder Alert</h1>
        </div>
        <div style="background:#fff;padding:30px;border-radius:0 0 16px 16px;box-shadow:0 4px 6px rgba(0,0,0,0.05);">
          <p style="color:#64748b;margin:0 0 20px;">Hi ${data.userName},</p>
          <div style="background:#f1f5f9;border-radius:12px;padding:20px;margin-bottom:20px;">
            <h2 style="color:#1e293b;margin:0 0 10px;font-size:20px;">${data.title}</h2>
            ${data.description ? `<p style="color:#64748b;margin:0 0 15px;">${data.description}</p>` : ''}
            <div style="display:flex;gap:10px;flex-wrap:wrap;">
              <span style="background:#dbeafe;color:#2563eb;padding:4px 12px;border-radius:20px;font-size:13px;">${data.category}</span>
              <span style="background:${data.priority === 'High' ? '#fee2e2' : data.priority === 'Medium' ? '#fef3c7' : '#dcfce7'};color:${data.priority === 'High' ? '#dc2626' : data.priority === 'Medium' ? '#d97706' : '#16a34a'};padding:4px 12px;border-radius:20px;font-size:13px;">${data.priority} Priority</span>
            </div>
          </div>
          <p style="color:#1e293b;font-size:16px;margin:0;">
            <strong>Due:</strong> ${data.dateTime}
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}

export function emiReminderEmailTemplate(data: {
  userName: string;
  loanTitle: string;
  platform: string;
  emiAmount: number;
  dueDate: string;
  pendingBalance: number;
  totalAmount: number;
  paidAmount: number;
  timeUntilDue: string;
}) {
  const progressPercent = Math.round((data.paidAmount / data.totalAmount) * 100);
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
      <div style="max-width:600px;margin:0 auto;padding:20px;">
        <div style="background:linear-gradient(135deg,#f59e0b,#d97706);border-radius:16px 16px 0 0;padding:30px;text-align:center;">
          <h1 style="color:#fff;margin:0;font-size:24px;">EMI Payment Reminder</h1>
          <p style="color:#fef3c7;margin:10px 0 0;font-size:14px;">${data.timeUntilDue}</p>
        </div>
        <div style="background:#fff;padding:30px;border-radius:0 0 16px 16px;box-shadow:0 4px 6px rgba(0,0,0,0.05);">
          <p style="color:#64748b;margin:0 0 20px;">Hi ${data.userName},</p>
          <p style="color:#1e293b;margin:0 0 20px;">Your EMI payment is coming up. Here are the details:</p>
          <div style="background:#f1f5f9;border-radius:12px;padding:20px;margin-bottom:20px;">
            <h2 style="color:#1e293b;margin:0 0 5px;font-size:20px;">${data.loanTitle}</h2>
            <p style="color:#64748b;margin:0 0 15px;font-size:14px;">${data.platform}</p>
            <table style="width:100%;border-collapse:collapse;">
              <tr>
                <td style="padding:8px 0;color:#64748b;font-size:14px;">EMI Amount</td>
                <td style="padding:8px 0;color:#1e293b;font-weight:600;text-align:right;font-size:16px;">
                  ₹${data.emiAmount.toLocaleString('en-IN')}
                </td>
              </tr>
              <tr>
                <td style="padding:8px 0;color:#64748b;font-size:14px;">Due Date</td>
                <td style="padding:8px 0;color:#1e293b;font-weight:600;text-align:right;">${data.dueDate}</td>
              </tr>
              <tr>
                <td style="padding:8px 0;color:#64748b;font-size:14px;">Pending Balance</td>
                <td style="padding:8px 0;color:#dc2626;font-weight:600;text-align:right;">
                  ₹${data.pendingBalance.toLocaleString('en-IN')}
                </td>
              </tr>
            </table>
          </div>
          <div style="margin-bottom:20px;">
            <div style="display:flex;justify-content:space-between;margin-bottom:5px;">
              <span style="color:#64748b;font-size:13px;">Repayment Progress</span>
              <span style="color:#1e293b;font-size:13px;font-weight:600;">${progressPercent}%</span>
            </div>
            <div style="background:#e2e8f0;border-radius:10px;height:10px;overflow:hidden;">
              <div style="background:linear-gradient(90deg,#22c55e,#16a34a);height:100%;width:${progressPercent}%;border-radius:10px;"></div>
            </div>
          </div>
          <p style="color:#64748b;font-size:13px;margin:0;text-align:center;">
            Please ensure sufficient balance in your account before the due date.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}
