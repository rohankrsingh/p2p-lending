/**
 * Resend email service.
 *
 * Lightweight wrapper around Resend SDK for P2P platform emails.
 * Silently skips if RESEND_API_KEY is not set (local dev).
 */
import { Resend } from 'resend';

const resendApiKey = process.env.RESEND_API_KEY;
const fromEmail = process.env.RESEND_FROM_EMAIL || 'p2p-lending <noreply@p2plend.example.com>';

let resend = null;

if (resendApiKey) {
  resend = new Resend(resendApiKey);
}

function canSend() {
  return !!resend;
}

/**
 * Send "Loan funded" notification to the borrower.
 */
export async function sendLoanFundedEmail({ borrowerEmail, borrowerName, amount, tenure }) {
  if (!canSend()) {
    console.log(`[Email] Would send loan-funded email to ${borrowerEmail}`);
    return;
  }

  try {
    await resend.emails.send({
      from: fromEmail,
      to: borrowerEmail,
      subject: `🎉 Your loan of ₹${amount.toLocaleString('en-IN')} has been funded!`,
      html: `
        <h2>Congratulations, ${borrowerName}!</h2>
        <p>Your loan request of <strong>₹${amount.toLocaleString('en-IN')}</strong> has been fully funded by a lender.</p>
        <p>The principal amount has been disbursed to your connected bank account via Stripe Connect (payouts usually settle within 1–2 business days).</p>
        <p>Your repayment schedule of <strong>${tenure || '—'} months</strong> starts from next month.</p>
        <p>You can view your repayment schedule in your <a href="${process.env.CLIENT_URL || 'http://localhost:5173'}/borrower/repayments">dashboard</a>.</p>
        <br/>
        <p style="color: #666; font-size: 12px;">P2P Lending Platform · Your micro-loan partner</p>
      `,
    });
    console.log(`[Email] Loan-funded email sent to ${borrowerEmail}`);
  } catch (err) {
    console.error('[Email] Failed to send loan-funded email:', err.message);
  }
}

/**
 * Send "Repayment received" notification to the lender.
 */
export async function sendRepaymentReceivedEmail({ lenderEmail, lenderName, amount, borrowerName, instalmentNumber }) {
  if (!canSend()) {
    console.log(`[Email] Would send repayment-received email to ${lenderEmail}`);
    return;
  }

  try {
    await resend.emails.send({
      from: fromEmail,
      to: lenderEmail,
      subject: `💰 Repayment received — ₹${amount.toLocaleString('en-IN')}`,
      html: `
        <h2>New Repayment Received</h2>
        <p>Hi ${lenderName},</p>
        <p>You've received a repayment of <strong>₹${amount.toLocaleString('en-IN')}</strong> from <strong>${borrowerName}</strong> for <strong>instalment #${instalmentNumber}</strong>.</p>
        <p>The amount has been transferred to your connected bank account (net of platform fees).</p>
        <p>View your investment portfolio <a href="${process.env.CLIENT_URL || 'http://localhost:5173'}/lender/investments">here</a>.</p>
        <br/>
        <p style="color: #666; font-size: 12px;">P2P Lending Platform · Earn while you lend</p>
      `,
    });
    console.log(`[Email] Repayment-received email sent to ${lenderEmail}`);
  } catch (err) {
    console.error('[Email] Failed to send repayment-received email:', err.message);
  }
}

/**
 * Send "Repayment due in 3 days" reminder to the borrower.
 */
export async function sendRepaymentReminderEmail({ borrowerEmail, borrowerName, amount, dueDate, instalmentNumber }) {
  if (!canSend()) {
    console.log(`[Email] Would send repayment-reminder email to ${borrowerEmail}`);
    return;
  }

  const formattedDate = new Date(dueDate).toLocaleDateString('en-IN', {
    month: 'long', day: 'numeric', year: 'numeric',
  });

  try {
    await resend.emails.send({
      from: fromEmail,
      to: borrowerEmail,
      subject: `⏰ EMI Reminder — ₹${amount.toLocaleString('en-IN')} due on ${formattedDate}`,
      html: `
        <h2>Repayment Reminder</h2>
        <p>Hi ${borrowerName},</p>
        <p>Your <strong>instalment #${instalmentNumber}</strong> of <strong>₹${amount.toLocaleString('en-IN')}</strong> is due on <strong>${formattedDate}</strong>.</p>
        <p>Please ensure sufficient funds are available on your card to avoid being marked overdue.</p>
        <p>Make a payment early from your <a href="${process.env.CLIENT_URL || 'http://localhost:5173'}/borrower/repayments">repayments dashboard</a>.</p>
        <br/>
        <p style="color: #666; font-size: 12px;">P2P Lending Platform · Stay on track</p>
      `,
    });
    console.log(`[Email] Repayment reminder sent to ${borrowerEmail}`);
  } catch (err) {
    console.error('[Email] Failed to send repayment reminder:', err.message);
  }
}

/**
 * Send "Repayment overdue" alert to the borrower.
 */
export async function sendOverdueEmail({ borrowerEmail, borrowerName, amount, dueDate, instalmentNumber }) {
  if (!canSend()) {
    console.log(`[Email] Would send overdue email to ${borrowerEmail}`);
    return;
  }

  const formattedDate = new Date(dueDate).toLocaleDateString('en-IN', {
    month: 'long', day: 'numeric', year: 'numeric',
  });

  try {
    await resend.emails.send({
      from: fromEmail,
      to: borrowerEmail,
      subject: `🚨 OVERDUE — Instalment #${instalmentNumber} of ₹${amount.toLocaleString('en-IN')}`,
      html: `
        <h2>Payment Overdue</h2>
        <p>Hi ${borrowerName},</p>
        <p>Your <strong>instalment #${instalmentNumber}</strong> of <strong>₹${amount.toLocaleString('en-IN')}</strong> was due on <strong>${formattedDate}</strong> and is now <strong>overdue</strong>.</p>
        <p>Please make the payment as soon as possible to bring your account back in good standing.</p>
        <p><a href="${process.env.CLIENT_URL || 'http://localhost:5173'}/borrower/repayments" style="display: inline-block; padding: 12px 24px; background: #ef4444; color: white; text-decoration: none; border-radius: 8px; font-weight: bold;">Pay Now</a></p>
        <br/>
        <p style="color: #666; font-size: 12px;">P2P Lending Platform · Don't delay</p>
      `,
    });
    console.log(`[Email] Overdue alert sent to ${borrowerEmail}`);
  } catch (err) {
    console.error('[Email] Failed to send overdue email:', err.message);
  }
}
