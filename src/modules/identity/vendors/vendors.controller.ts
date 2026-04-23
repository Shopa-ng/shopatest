import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  UseGuards,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiQuery,
} from '@nestjs/swagger';
import { VendorsService } from './vendors.service';
import {
  RegisterVendorDto,
  UpdateVendorDto,
  VerifyVendorDto,
  RequestWithdrawalDto,
  ProcessWithdrawalDto,
} from './dto';
import { JwtAuthGuard } from '../auth/guards';
import { RolesGuard } from '../../../common/guards';
import { CurrentUser, Roles } from '../../../common/decorators';
import { UserRole, WithdrawalStatus } from '@prisma/client';

@ApiTags('Vendors')
@Controller('vendors')
export class VendorsController {
  constructor(private readonly vendorsService: VendorsService) {}

  // ─── Public ───────────────────────────────────────────────────────────────────

  @Post('register')
  @ApiOperation({ summary: 'Register as a new vendor' })
  @ApiResponse({ status: 201, description: 'Registration submitted for approval' })
  @ApiResponse({ status: 409, description: 'Email already exists' })
  async register(@Body() dto: RegisterVendorDto) {
    return this.vendorsService.register(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all approved vendors' })
  @ApiQuery({ name: 'campusId', required: false })
  async findAll(@Query('campusId') campusId?: string) {
    return this.vendorsService.findAll(campusId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get vendor by ID' })
  async findOne(@Param('id') id: string) {
    return this.vendorsService.findById(id);
  }

  // ─── Vendor (authenticated) ───────────────────────────────────────────────────

  @Get('me/profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current vendor profile' })
  async getMyProfile(@CurrentUser('id') userId: string) {
    return this.vendorsService.getMyProfile(userId);
  }

  @Patch('me/profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update vendor profile' })
  async updateProfile(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateVendorDto,
  ) {
    return this.vendorsService.updateProfile(userId, dto);
  }

  @Get('me/balance')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get vendor available balance' })
  async getBalance(@CurrentUser('id') userId: string) {
    return this.vendorsService.getAvailableBalance(userId);
  }

  @Post('me/withdrawal')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Request a withdrawal' })
  async requestWithdrawal(
    @CurrentUser('id') userId: string,
    @Body() dto: RequestWithdrawalDto,
  ) {
    return this.vendorsService.requestWithdrawal(userId, dto);
  }

  @Get('me/withdrawals')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get withdrawal history' })
  async getWithdrawalHistory(@CurrentUser('id') userId: string) {
    return this.vendorsService.getWithdrawalHistory(userId);
  }

  // ─── Admin ────────────────────────────────────────────────────────────────────

  @Get('admin/pending')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get pending vendor applications (admin)' })
  @ApiQuery({ name: 'campusId', required: false })
  async getPendingVendors(@Query('campusId') campusId?: string) {
    return this.vendorsService.getPendingVendors(campusId);
  }

  @Patch('admin/:id/verify')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Approve or reject vendor application (admin)' })
  async verifyVendor(
    @Param('id') id: string,
    @Body() dto: VerifyVendorDto,
  ) {
    return this.vendorsService.verifyVendor(id, dto.status, dto.reason);
  }

  // ─── Super Admin ──────────────────────────────────────────────────────────────

  @Get('admin/withdrawals')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all withdrawal requests (admin)' })
  @ApiQuery({ name: 'status', required: false, enum: WithdrawalStatus })
  async getAllWithdrawals(@Query('status') status?: WithdrawalStatus) {
    return this.vendorsService.getAllWithdrawals(status);
  }

  @Patch('admin/withdrawals/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Process withdrawal request (admin)' })
  async processWithdrawal(
    @Param('id') id: string,
    @CurrentUser('id') adminId: string,
    @Body() dto: ProcessWithdrawalDto,
  ) {
    return this.vendorsService.processWithdrawal(id, adminId, dto);
  }
} 