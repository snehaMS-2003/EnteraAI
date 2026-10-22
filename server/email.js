/**
 * ==============================================================================
 * ENTERA.AI — EMAIL & NOTIFICATION SERVICE
 * ==============================================================================
 * Handles secure transactional email delivery (e.g. password resets, invites).
 *
 * Configured via environment variables:
 * - SMTP_HOST
 * - SMTP_PORT (default 587)
 * - SMTP_USER
 * - SMTP_PASSWORD / SMTP_PASS
 * - SMTP_FROM / EMAIL_FROM (default: "Entera.ai Security <no-reply@entera.ai>")
 * - SMTP_SECURE (true for port 465, default false)
 * ==============================================================================
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
require('dotenv').config();
const nodemailer = require('nodemailer');

// In-memory store for recent delivered emails (useful for end-to-end testing and verification)
const deliveredEmailStore = new Map();

/**
 * Mask an email address for safe logging (e.g., "ad***@gmail.com")
 */
function maskEmail(email) {
  if (!email || typeof email !== 'string') return '***';
  return email.replace(/(.{2})(.*)(@.*)/, '$1***$3');
}

/**
 * Checks whether outbound SMTP delivery is configured.
 */
function isEmailConfigured() {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASSWORD || process.env.SMTP_PASS;
  return Boolean(host && user && pass);
}

/**
 * Creates and configures a nodemailer transporter using project environment variables.
 */
function createTransporter() {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASSWORD || process.env.SMTP_PASS;
  const secure = process.env.SMTP_SECURE === 'true' || port === 465;

  if (!host || !user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user,
      pass,
    },
    // Reasonable timeouts to prevent hanging
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
  });
}

/**
 * Sends a professional password reset email.
 *
 * @param {Object} options
 * @param {string} options.email - Recipient email
 * @param {string} options.resetUrl - Full secure password reset URL
 * @param {string} options.rawToken - Raw token for dev tracking
 * @returns {Promise<{ delivered: boolean, configured: boolean, messageId?: string, accepted?: string[], previewUrl?: string, reason?: string }>}
 */
async function sendPasswordResetEmail({ email, resetUrl, rawToken }) {
  if (!email || !resetUrl) {
    throw new Error('Email address and resetUrl are required');
  }

  const normalizedEmail = email.trim().toLowerCase();
  const masked = maskEmail(normalizedEmail);
  const configured = isEmailConfigured();

  if (!configured) {
    console.warn(`[EMAIL WARNING] Outbound SMTP is not configured. Missing SMTP_HOST, SMTP_USER, or SMTP_PASSWORD.`);
    return {
      delivered: false,
      configured: false,
      reason: 'SMTP credentials (SMTP_HOST, SMTP_USER, SMTP_PASSWORD) are not configured in environment',
      devResetUrl: resetUrl,
      devToken: rawToken,
    };
  }

  try {
    const transporter = createTransporter();
    if (!transporter) {
      throw new Error('Failed to initialize SMTP transporter');
    }

    const fromAddress = process.env.SMTP_FROM || process.env.EMAIL_FROM || 'Entera.ai Security <no-reply@entera.ai>';

    console.log(`[AUTH] Dispatching password reset email to: ${masked} via SMTP (${process.env.SMTP_HOST}:${process.env.SMTP_PORT || 587})`);

    const info = await transporter.sendMail({
      from: fromAddress,
      to: normalizedEmail,
      subject: 'Reset Your Entera.ai Password',
      text: [
        'Entera.ai — Password Reset Request',
        '',
        'Hello,',
        '',
        'We received a request to reset the password for your Entera.ai account.',
        'Please click the link below or paste it into your browser to set a new password:',
        '',
        resetUrl,
        '',
        'This link is valid for 1 hour. For security, do not share this link with anyone.',
        'If you did not request a password reset, please ignore this email. Your password will remain unchanged.',
        '',
        'Best regards,',
        'The Entera.ai Security Team',
        'https://app.entera.ai'
      ].join('\n'),
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Reset Your Entera.ai Password</title>
        </head>
        <body style="margin: 0; padding: 0; background-color: #0b0f19; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f1f5f9;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #0b0f19; padding: 40px 16px;">
            <tr>
              <td align="center">
                <table role="presentation" width="100%" style="max-width: 580px; background-color: #111827; border: 1px solid #1f2937; border-radius: 12px; overflow: hidden; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);">
                  
                  <!-- Header -->
                  <tr>
                    <td style="padding: 32px 36px; border-bottom: 1px solid #1f2937; background: linear-gradient(180deg, #1e1b4b 0%, #111827 100%);">
                      <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                        <tr>
                          <td>
                            <span style="font-size: 24px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px;">
                              Entera<span style="color: #6366f1;">.ai</span>
                            </span>
                            <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #818cf8; margin-top: 4px; font-weight: 600;">
                              Enterprise AI Application Platform
                            </div>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>

                  <!-- Body Content -->
                  <tr>
                    <td style="padding: 36px;">
                      <h1 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 700; color: #ffffff;">
                        Reset Your Password
                      </h1>
                      
                      <p style="margin: 0 0 16px 0; font-size: 15px; line-height: 1.6; color: #cbd5e1;">
                        Hello,
                      </p>
                      
                      <p style="margin: 0 0 28px 0; font-size: 15px; line-height: 1.6; color: #cbd5e1;">
                        A password reset request was received for your Entera.ai account. Click the button below to choose a new, secure password:
                      </p>
                      
                      <!-- Button -->
                      <table role="presentation" cellspacing="0" cellpadding="0" style="margin: 28px 0;">
                        <tr>
                          <td style="border-radius: 8px; background: linear-gradient(135deg, #4f46e5 0%, #6366f1 100%); text-align: center;">
                            <a href="${resetUrl}" 
                               style="display: inline-block; padding: 14px 28px; font-size: 15px; font-weight: 600; color: #ffffff; text-decoration: none; border-radius: 8px;">
                              Reset Password &rarr;
                            </a>
                          </td>
                        </tr>
                      </table>

                      <p style="margin: 24px 0 8px 0; font-size: 13px; color: #94a3b8; line-height: 1.5;">
                        Or copy and paste this secure link directly into your browser:
                      </p>
                      <p style="margin: 0 0 28px 0; font-size: 12px; color: #818cf8; word-break: break-all; font-family: monospace; background: #0f172a; padding: 12px; border-radius: 6px; border: 1px solid #1e293b;">
                        ${resetUrl}
                      </p>

                      <!-- Expiration & Security Notice -->
                      <div style="background-color: #1e1b4b/40; border-left: 3px solid #6366f1; padding: 14px 16px; border-radius: 0 6px 6px 0; margin-bottom: 24px;">
                        <p style="margin: 0; font-size: 13px; line-height: 1.5; color: #cbd5e1;">
                          <strong>Expiration Notice:</strong> This reset link will expire in <strong>1 hour</strong>. For security reasons, it can only be used once.
                        </p>
                      </div>

                      <p style="margin: 0; font-size: 13px; line-height: 1.5; color: #64748b;">
                        If you did not request this password reset, you can safely ignore this email. Your current password remains active and secure.
                      </p>
                    </td>
                  </tr>

                  <!-- Footer -->
                  <tr>
                    <td style="padding: 24px 36px; background-color: #0f172a; border-top: 1px solid #1f2937; text-align: center;">
                      <p style="margin: 0; font-size: 12px; color: #64748b;">
                        &copy; 2026 Entera.ai. All rights reserved. Enterprise AI Platform.
                      </p>
                      <p style="margin: 6px 0 0 0; font-size: 11px; color: #475569;">
                        This is an automated system email. Please do not reply directly to this message.
                      </p>
                    </td>
                  </tr>

                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `,
    });

    const previewUrl = nodemailer.getTestMessageUrl(info) || null;
    console.log(`[AUTH] Email provider accepted message: ${info.messageId} (Recipient: ${masked})`);
    if (previewUrl) {
      console.log(`[AUTH] Ethereal live message preview URL: ${previewUrl}`);
    }

    // Save in delivered store for automated end-to-end verification
    deliveredEmailStore.set(normalizedEmail, {
      email: normalizedEmail,
      messageId: info.messageId,
      accepted: info.accepted,
      previewUrl,
      resetUrl,
      token: rawToken,
      timestamp: Date.now(),
    });

    return {
      delivered: true,
      configured: true,
      messageId: info.messageId,
      accepted: info.accepted,
      previewUrl,
      devResetUrl: resetUrl,
      devToken: rawToken,
    };
  } catch (smtpErr) {
    console.error(`[AUTH ERROR] SMTP email delivery failed for ${masked}: ${smtpErr.message}`);
    return {
      delivered: false,
      configured: true,
      reason: smtpErr.message,
    };
  }
}

/**
 * Development / Test helper: retrieves the latest delivered email record.
 */
function getLastDeliveredEmail(email) {
  if (!email) return null;
  return deliveredEmailStore.get(email.trim().toLowerCase()) || null;
}

/**
 * Clears delivered email store.
 */
function clearDeliveredEmailStore() {
  deliveredEmailStore.clear();
}

module.exports = {
  isEmailConfigured,
  sendPasswordResetEmail,
  getLastDeliveredEmail,
  clearDeliveredEmailStore,
  maskEmail,
};
