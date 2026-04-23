import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { DisputeStatus, UserRole } from '@prisma/client';
import { CurrentUser, Roles } from 'src/common/decorators';
import { RolesGuard } from 'src/common/guards';
import { JwtAuthGuard } from 'src/modules/identity/auth/guards';
import { DisputesService } from './disputes.service';
import { CreateDisputeDto, ResolveDisputeDto } from './dto';
import { RespondToDisputeDto } from './dto/dispute.dto';

@ApiTags('Disputes')
@Controller('disputes')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class DisputesController {
  constructor(private readonly disputesService: DisputesService) {}

  @Get('my-disputes')
  @ApiOperation({ summary: 'Get my disputes (Buyer)' })
  async getMyDisputes(@CurrentUser('id') userId: string) {
    return this.disputesService.findByUser(userId);
  }

  @Get('vendor-disputes')
  @UseGuards(RolesGuard)
  @Roles(UserRole.VENDOR)
  @ApiOperation({ summary: 'Get disputes on my orders (Vendor)' })
  async getVendorDisputes(@CurrentUser('id') userId: string) {
    return this.disputesService.findByVendor(userId);
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get all disputes (Admin)' })
  async findAll(@Query('status') status?: DisputeStatus) {
    return this.disputesService.findAll(status);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get dispute by ID' })
  async findById(@Param('id') id: string) {
    return this.disputesService.findById(id);
  }

  @Post()
  @ApiOperation({ summary: 'Raise a dispute (Buyer)' })
  async create(
    @CurrentUser('id') userId: string,
    @Body() createDto: CreateDisputeDto,
  ) {
    return this.disputesService.create(userId, createDto);
  }

  @Post(':id/respond')
  @UseGuards(RolesGuard)
  @Roles(UserRole.VENDOR)
  @ApiOperation({ summary: 'Respond to a dispute (Vendor)' })
  async respond(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: RespondToDisputeDto,
  ) {
    return this.disputesService.respondToDispute(id, userId, dto.response);
  }

  @Patch(':id/resolve')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Resolve dispute (Admin)' })
  async resolve(
    @Param('id') id: string,
    @CurrentUser('id') adminId: string,
    @Body() resolveDto: ResolveDisputeDto,
  ) {
    return this.disputesService.resolve(id, adminId, resolveDto);
  }
} 