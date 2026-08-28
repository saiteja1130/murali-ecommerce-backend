import nodemailer from 'nodemailer';

export const sendEmail = async ({ to, subject, html }) => {
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.mailtrap.io',
      port: process.env.SMTP_PORT || 2525,
      auth: {
        user: process.env.SMTP_USER || 'dummy_user',
        pass: process.env.SMTP_PASS || 'dummy_password'
      }
    });

    const mailOptions = {
      from: '"SUMILUX Admin" <noreply@sumilux.com>',
      to,
      subject,
      html
    };

    if (process.env.NODE_ENV === 'development') {
      console.log(`\n================================`);
      console.log(`[DUMMY EMAIL SENT to ${to}]`);
      console.log(`Subject: ${subject}`);
      console.log(`Content:\n${html.replace(/<[^>]+>/g, '')}`); // Strip HTML tags for console
      console.log(`================================\n`);
    } else {
      await transporter.sendMail(mailOptions);
    }

    return true;
  } catch (error) {
    console.error(`Error sending email to ${to}:`, error);
    return false;
  }
};
