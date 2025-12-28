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

@ApiTags('Disputes')
@Controller('disputes')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class DisputesController {
  constructor(private readonly disputesService: DisputesService) {}

  @Get('my-disputes')
  @ApiOperation({ summary: 'Get my disputes' })
  async getMyDisputes(@CurrentUser('id') userId: string) {
    return this.disputesService.findByUser(userId);
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
  @ApiOperation({ summary: 'Create a dispute' })
  async create(
    @CurrentUser('id') userId: string,
    @Body() createDto: CreateDisputeDto,
  ) {
    return this.disputesService.create(userId, createDto);
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
