import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';
import * as dotenv from 'dotenv';

dotenv.config();

function envValue(key: string): string {
  let raw = String(process.env[key] ?? '').trim();
  if (
    (raw.startsWith('"') && raw.endsWith('"')) ||
    (raw.startsWith("'") && raw.endsWith("'"))
  ) {
    raw = raw.slice(1, -1);
  }
  return raw.trim();
}

const MAIL_FROM =
  envValue('MAIL_FROM') ||
  envValue('SMTP_USER') ||
  envValue('MAIL_USERNAME') ||
  'noreply@iteach-ifuntology.com';
const MAIL_FROM_NAME = envValue('MAIL_FROM_NAME') || 'iTeach iFuntology';

function createTransporter(): Transporter {
  const host = envValue('SMTP_HOST') || envValue('MAIL_HOST');
  const port = Number(envValue('SMTP_PORT') || envValue('MAIL_PORT') || 587);
  const user = envValue('SMTP_USER') || envValue('MAIL_USERNAME');
  const pass = envValue('SMTP_PASS') || envValue('MAIL_PASSWORD');

  if (host && user && pass) {
    return nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });
  }

  return nodemailer.createTransport({
    host: 'sandbox.smtp.mailtrap.io',
    port: 2525,
    auth: {
      user: envValue('MAILTRAP_USER'),
      pass: envValue('MAILTRAP_PASS'),
    },
  });
}

export type SendEmailOptions = {
  replyTo?: string;
};

@Injectable()
export class EmailService {
  private transporter: Transporter | null = null;

  private getTransporter(): Transporter {
    if (!this.transporter) {
      this.transporter = createTransporter();
    }
    return this.transporter;
  }

  async sendEmail(
    to: string,
    subject: string,
    html: string,
    attachments: any[] = [],
    options: SendEmailOptions = {},
  ): Promise<boolean> {
    try {
      console.log('Sending email to:', to, 'subject:', subject);

      const mailOptions: nodemailer.SendMailOptions = {
        from: `"${MAIL_FROM_NAME}" <${MAIL_FROM}>`,
        to,
        subject,
        html,
        attachments,
      };

      if (options.replyTo) {
        mailOptions.replyTo = options.replyTo;
      }

      await this.getTransporter().sendMail(mailOptions);
      return true;
    } catch (error: any) {
      console.error('Error sending email:', error);
      return false;
    }
  }
}
