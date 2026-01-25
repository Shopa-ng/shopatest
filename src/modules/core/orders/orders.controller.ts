import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { CurrentUser, Roles } from 'src/common/decorators';
import { RolesGuard } from 'src/common/guards';
import { JwtAuthGuard } from 'src/modules/identity/auth/guards';
import { CreateOrderDto, UpdateOrderStatusDto } from './dto';
import { OrdersService } from './orders.service';

@ApiTags('Orders')
@Controller('orders')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get('my-orders')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get orders placed by me (Buyer)' })
  async getMyOrders(@CurrentUser('id') userId: string) {
    return this.ordersService.findByBuyer(userId);
  }

  @Get('vendor-orders')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RolesGuard)
  @Roles(UserRole.VENDOR)
  @ApiOperation({ summary: 'Get orders received (Vendor)' })
  async getVendorOrders(@CurrentUser('id') userId: string) {
    return this.ordersService.findByVendor(userId);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get order by ID' })
  async findById(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.ordersService.findById(id, userId);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new order' })
  async create(
    @CurrentUser('id') userId: string,
    @Body() createDto: CreateOrderDto,
  ) {
    return this.ordersService.create(userId, createDto);
  }

  @Patch(':id/status')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RolesGuard)
  @Roles(UserRole.VENDOR)
  @ApiOperation({ summary: 'Update order status (Vendor)' })
  async updateStatus(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() updateDto: UpdateOrderStatusDto,
  ) {
    return this.ordersService.updateStatus(id, userId, updateDto);
  }

  @Post(':id/confirm-delivery')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Confirm delivery (Buyer)' })
  async confirmDelivery(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.ordersService.confirmDelivery(id, userId);
  }
}
