import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

export interface EmailOptions {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private resend: Resend;
  private from: string;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('mail.resendApiKey');
    this.resend = new Resend(apiKey);
    this.from =
      this.configService.get<string>('mail.from') || 'Shopa <noreply@shopa.ng>';
  }

  async sendEmail(options: EmailOptions): Promise<boolean> {
    try {
      const { data, error } = await this.resend.emails.send({
        from: this.from,
        to: Array.isArray(options.to) ? options.to : [options.to],
        subject: options.subject,
        html: options.html || options.text || '',
      });

      if (error) {
        this.logger.error(`Failed to send email: ${error.message}`);
        return false;
      }

      this.logger.log(`Email sent: ${data?.id} to ${options.to}`);
      return true;
    } catch (error) {
      this.logger.error(`Email send error:`, error);
      return false;
    }
  }

  // Pre-built email templates
  async sendWelcomeEmail(to: string, firstName: string): Promise<boolean> {
    const frontendUrl = this.configService.get('app.frontendUrl');
    return this.sendEmail({
      to,
      subject: 'Welcome to Shopa! 🎉',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #4F46E5;">Welcome to Shopa, ${firstName}!</h1>
          <p>Thank you for joining the student marketplace. You can now:</p>
          <ul>
            <li>Browse products from verified campus vendors</li>
            <li>Buy items with escrow protection</li>
            <li>Apply to become a vendor</li>
          </ul>
          <p>Get started by exploring products near your campus.</p>
          <a href="${frontendUrl}" 
             style="display: inline-block; background: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
            Start Shopping
          </a>
          <p style="margin-top: 20px; color: #666;">
            Questions? Reply to this email or contact support.
          </p>
        </div>
      `,
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
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #4F46E5;">Order Confirmed! ✅</h1>
          <p>Your order <strong>${orderNumber}</strong> has been placed successfully.</p>
          <div style="background: #f4f4f5; padding: 16px; border-radius: 8px; margin: 16px 0;">
            <p><strong>Vendor:</strong> ${vendorName}</p>
            <p><strong>Total:</strong> ₦${totalAmount.toLocaleString()}</p>
          </div>
          <p>Your payment is held safely in escrow until you confirm delivery.</p>
          <p style="color: #666;">Track your order in the Shopa app.</p>
        </div>
      `,
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
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #4F46E5;">Order Update</h1>
          <p>Order <strong>${orderNumber}</strong></p>
          <div style="background: #f4f4f5; padding: 16px; border-radius: 8px; margin: 16px 0;">
            <p><strong>Status:</strong> ${status}</p>
            <p>${statusMessages[status] || 'Your order status has been updated.'}</p>
          </div>
        </div>
      `,
    });
  }

  async sendVendorApproved(to: string, storeName: string): Promise<boolean> {
    const frontendUrl = this.configService.get('app.frontendUrl');
    return this.sendEmail({
      to,
      subject: 'Your Vendor Account is Approved! 🎉',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #4F46E5;">Congratulations!</h1>
          <p>Your vendor account <strong>${storeName}</strong> has been approved.</p>
          <p>You can now:</p>
          <ul>
            <li>List products for sale</li>
            <li>Receive orders from students</li>
            <li>Get paid through our escrow system</li>
          </ul>
          <a href="${frontendUrl}/vendor/dashboard" 
             style="display: inline-block; background: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
            Go to Dashboard
          </a>
        </div>
      `,
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
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #4F46E5;">Dispute Update</h1>
          <p>Your dispute has been updated.</p>
          <div style="background: #f4f4f5; padding: 16px; border-radius: 8px; margin: 16px 0;">
            <p><strong>Status:</strong> ${status}</p>
            ${resolution ? `<p><strong>Resolution:</strong> ${resolution}</p>` : ''}
          </div>
        </div>
      `,
    });
  }

  async sendPasswordReset(to: string, resetToken: string): Promise<boolean> {
    const resetUrl = `${this.configService.get('app.frontendUrl')}/reset-password?token=${resetToken}`;

    return this.sendEmail({
      to,
      subject: 'Reset Your Password',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #4F46E5;">Password Reset</h1>
          <p>You requested to reset your password. Click the button below:</p>
          <a href="${resetUrl}" 
             style="display: inline-block; background: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
            Reset Password
          </a>
          <p style="margin-top: 20px; color: #666;">
            If you didn't request this, please ignore this email.
          </p>
          <p style="color: #999; font-size: 12px;">
            This link expires in 1 hour.
          </p>
        </div>
      `,
    });
  }
}
