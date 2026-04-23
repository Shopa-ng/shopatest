import { Module } from '@nestjs/common';
import { VendorsController } from './vendors.controller';
import { VendorsService } from './vendors.service';
import { EmailModule } from '../../communication/email';
import { PrismaModule } from '../../../prisma';

@Module({
  imports: [EmailModule, PrismaModule],
  controllers: [VendorsController],
  providers: [VendorsService],
  exports: [VendorsService],
})
export class VendorsModule {}