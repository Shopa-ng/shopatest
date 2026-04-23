import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { CreateOrderDto, UpdateOrderStatusDto } from './dto';
import { JwtAuthGuard } from 'src/modules/identity/auth/guards';
import { RolesGuard } from 'src/common/guards';
import { CurrentUser, Roles } from 'src/common/decorators';
import { UserRole } from '@prisma/client';
import { RejectOrderDto } from './dto/order.dto';

@ApiTags('Orders')
@Controller('orders')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get('my-orders')
  @ApiOperation({ summary: 'Get orders placed by me (Buyer)' })
  async getMyOrders(@CurrentUser('id') userId: string) {
    return this.ordersService.findByBuyer(userId);
  }

  @Get('vendor-orders')
  @UseGuards(RolesGuard)
  @Roles(UserRole.VENDOR)
  @ApiOperation({ summary: 'Get orders received (Vendor)' })
  async getVendorOrders(@CurrentUser('id') userId: string) {
    return this.ordersService.findByVendor(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get order by ID' })
  async findById(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.ordersService.findById(id, userId);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new order' })
  async create(
    @CurrentUser('id') userId: string,
    @Body() createDto: CreateOrderDto,
  ) {
    return this.ordersService.create(userId, createDto);
  }

  @Post(':id/accept')
  @UseGuards(RolesGuard)
  @Roles(UserRole.VENDOR)
  @ApiOperation({ summary: 'Accept an order (Vendor)' })
  async acceptOrder(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.ordersService.acceptOrder(id, userId);
  }

  @Post(':id/reject')
  @UseGuards(RolesGuard)
  @Roles(UserRole.VENDOR)
  @ApiOperation({ summary: 'Reject an order (Vendor)' })
  async rejectOrder(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: RejectOrderDto,
  ) {
    return this.ordersService.rejectOrder(id, userId, dto.reason);
  }

  @Patch(':id/status')
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
  @ApiOperation({ summary: 'Confirm delivery (Buyer)' })
  async confirmDelivery(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.ordersService.confirmDelivery(id, userId);
  }
} 