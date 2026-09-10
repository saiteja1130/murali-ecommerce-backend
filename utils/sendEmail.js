import nodemailer from 'nodemailer';

let transporter = null;

/**
 * Get or initialize Nodemailer transporter with Gmail SMTP
 */
export const getEmailTransporter = () => {
  if (!transporter) {
    const user = (process.env.EMAIL_USER).trim();
    // Normalize Google App Password by removing any spaces
    const pass = (process.env.EMAIL_PASS).replace(/\s+/g, '').trim();

    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user,
        pass,
      },
      pool: true,
      maxConnections: 5,
      maxMessages: 100,
    });
  }
  return transporter;
};

/**
 * Send an email using configured Gmail SMTP credentials
 * @param {Object} options
 * @param {string} options.to - Recipient email address
 * @param {string} options.subject - Email subject line
 * @param {string} options.html - HTML content
 * @param {string} [options.text] - Plain text fallback
 * @returns {Promise<boolean>}
 */
export const sendEmail = async ({ to, subject, html, text }) => {
  try {
    if (!to) {
      console.warn('[sendEmail] Missing recipient email address. Aborting.');
      return false;
    }

    const mailer = getEmailTransporter();
    const from = process.env.EMAIL_FROM || '"Murari\'s Glam & Glow" <murariglamandglow@gmail.com>';

    const mailOptions = {
      from,
      to,
      subject,
      html,
      text: text || (html ? html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() : ''),
    };

    const info = await mailer.sendMail(mailOptions);
    console.log(`[Email Sent] To: ${to} | Subject: "${subject}" | MessageId: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error(`[Email Error] Failed to send to ${to} ("${subject}"):`, error.message);
    return false;
  }
};

/**
 * Diagnostic utility to verify SMTP authentication
 */
export const verifySmtpConnection = async () => {
  try {
    const mailer = getEmailTransporter();
    await mailer.verify();
    console.log('✓ Gmail SMTP connection verified successfully with murariglamandglow@gmail.com');
    return true;
  } catch (error) {
    console.error('✗ Gmail SMTP connection verification failed:', error.message);
    return false;
  }
};
