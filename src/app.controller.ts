import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppService } from './app.service';
import { EmailService } from './modules/communication/email';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('debug/test-email')
  async testEmail() {
    const apiKey = this.configService.get<string>('mail.resendApiKey');
    const from = this.configService.get<string>('mail.from');

    const sent = await this.emailService.sendEmail({
      to: 'ayolawal19@gmail.com',
      subject: 'Shopa email test',
      template: 'order-status',
      context: {
        firstName: 'Ayo',
        orderNumber: 'TEST-001',
        status: 'EMAIL_TEST',
        statusMessage: 'If you received this, the Resend email service is working correctly on the production server.',
      },
    });

    return {
      sent,
      resendApiKeyPresent: !!apiKey,
      resendApiKeyPrefix: apiKey ? apiKey.slice(0, 8) + '...' : null,
      from,
    };
  }
}
