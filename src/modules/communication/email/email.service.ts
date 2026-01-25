import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import * as Handlebars from 'handlebars';
import * as fs from 'fs';
import * as path from 'path';

export interface EmailOptions {
  to: string | string[];
  subject: string;
  template: string;
  context: Record<string, any>;
}

@Injectable()
export class EmailService implements OnModuleInit {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;
  private from: string;
  private templates: Map<string, Handlebars.TemplateDelegate> = new Map();
  private templatesDir: string;

  constructor(private configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>('mail.host'),
      port: this.configService.get<number>('mail.port'),
      secure: this.configService.get<boolean>('mail.secure'),
      auth: {
        user: this.configService.get<string>('mail.user'),
        pass: this.configService.get<string>('mail.pass'),
      },
    });
    this.from =
      this.configService.get<string>('mail.from') || 'Shopa <noreply@shopa.ng>';
    this.templatesDir = path.resolve(
      process.cwd(),
      'dist/modules/communication/email/templates',
    );
  }

  onModuleInit() {
    this.loadTemplates();
    this.verifyConnection();
  }

  private async verifyConnection() {
    try {
      await this.transporter.verify();
      this.logger.log('SMTP connection verified');
    } catch (error) {
      this.logger.warn(
        'SMTP connection failed - emails will not be sent:',
        error,
      );
    }
  }

  private loadTemplates() {
    const templateFiles = [
      'welcome',
      'order-confirmation',
      'order-status',
      'vendor-approved',
      'dispute-update',
      'password-reset',
    ];

    for (const name of templateFiles) {
      try {
        const filePath = path.join(this.templatesDir, `${name}.hbs`);
        const templateContent = fs.readFileSync(filePath, 'utf-8');
        this.templates.set(name, Handlebars.compile(templateContent));
        this.logger.log(`Loaded email template: ${name}`);
      } catch (error) {
        this.logger.warn(`Failed to load template ${name}: ${error}`);
      }
    }
  }

  private renderTemplate(
    template: string,
    context: Record<string, any>,
  ): string {
    const compiledTemplate = this.templates.get(template);
    if (!compiledTemplate) {
      throw new Error(`Template ${template} not found`);
    }
    return compiledTemplate({
      ...context,
      year: new Date().getFullYear(),
      frontendUrl: this.configService.get('app.frontendUrl'),
    });
  }

  async sendEmail(options: EmailOptions): Promise<boolean> {
    try {
      const html = this.renderTemplate(options.template, options.context);

      const info = await this.transporter.sendMail({
        from: this.from,
        to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
        subject: options.subject,
        html,
      });

      this.logger.log(`Email sent: ${info.messageId} to ${options.to}`);
      return true;
    } catch (error) {
      this.logger.error(`Email send error:`, error);
      return false;
    }
  }

  // Pre-built email methods
  async sendWelcomeEmail(to: string, firstName: string): Promise<boolean> {
    return this.sendEmail({
      to,
      subject: 'Welcome to Shopa! 🎉',
      template: 'welcome',
      context: { firstName },
    });
  }

  async sendOrderConfirmation(
    to: string,
    orderNumber: string,
    totalAmount: number,
    vendorName: string,
  ): Promise<boolean> {
    return this.sendEmail({
      to,
      subject: `Order Confirmed: ${orderNumber}`,
      template: 'order-confirmation',
      context: {
        orderNumber,
        totalAmount: totalAmount.toLocaleString(),
        vendorName,
      },
    });
  }

  async sendOrderStatusUpdate(
    to: string,
    orderNumber: string,
    status: string,
  ): Promise<boolean> {
    const statusMessages: Record<string, string> = {
      CONFIRMED: 'Your order has been confirmed by the vendor.',
      SHIPPED: 'Your order is on its way!',
      DELIVERED:
        'Your order has been marked as delivered. Please confirm receipt.',
      COMPLETED: 'Order completed. Thank you for shopping with Shopa!',
      CANCELLED: 'Your order has been cancelled.',
    };

    return this.sendEmail({
      to,
      subject: `Order Update: ${orderNumber}`,
      template: 'order-status',
      context: {
        orderNumber,
        status,
        statusMessage: statusMessages[status] || 'Status updated',
      },
    });
  }

  async sendVendorApproved(to: string, storeName: string): Promise<boolean> {
    return this.sendEmail({
      to,
      subject: 'Your Vendor Account is Approved! 🎉',
      template: 'vendor-approved',
      context: { storeName },
    });
  }

  async sendDisputeUpdate(
    to: string,
    disputeId: string,
    status: string,
    resolution?: string,
  ): Promise<boolean> {
    return this.sendEmail({
      to,
      subject: `Dispute Update: ${disputeId.slice(0, 8)}`,
      template: 'dispute-update',
      context: { status, resolution },
    });
  }

  async sendPasswordReset(to: string, resetToken: string): Promise<boolean> {
    const resetUrl = `${this.configService.get('app.frontendUrl')}/reset-password?token=${resetToken}`;

    return this.sendEmail({
      to,
      subject: 'Reset Your Password',
      template: 'password-reset',
      context: { resetUrl },
    });
  }
}
