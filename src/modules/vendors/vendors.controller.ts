import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { VendorsService } from './vendors.service';
import { ApplyVendorDto, UpdateVendorDto, VerifyVendorDto } from './dto';
import { JwtAuthGuard } from '../auth/guards';
import { RolesGuard } from '../../common/guards';
import { CurrentUser, Roles } from '../../common/decorators';
import { UserRole } from '@prisma/client';

@ApiTags('Vendors')
@Controller('vendors')
export class VendorsController {
  constructor(private readonly vendorsService: VendorsService) {}

  @Get()
  @ApiOperation({ summary: 'List all vendors' })
  async findAll(
    @Query('campusId') campusId?: string,
    @Query('verifiedOnly') verifiedOnly?: boolean,
  ) {
    return this.vendorsService.findAll(campusId, verifiedOnly ?? true);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get my vendor profile' })
  async getMyProfile(@CurrentUser('id') userId: string) {
    return this.vendorsService.getMyVendorProfile(userId);
  }

  @Get('pending')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get pending vendor verifications (Admin)' })
  async getPending() {
    return this.vendorsService.findPendingVerifications();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get vendor by ID' })
  async findById(@Param('id') id: string) {
    return this.vendorsService.findById(id);
  }

  @Post('apply')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Apply to become a vendor' })
  async apply(
    @CurrentUser('id') userId: string,
    @Body() applyDto: ApplyVendorDto,
  ) {
    return this.vendorsService.apply(userId, applyDto);
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update my vendor profile' })
  async update(
    @CurrentUser('id') userId: string,
    @Body() updateDto: UpdateVendorDto,
  ) {
    return this.vendorsService.update(userId, updateDto);
  }

  @Patch(':id/verify')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Verify vendor (Admin)' })
  async verify(@Param('id') id: string, @Body() verifyDto: VerifyVendorDto) {
    return this.vendorsService.verify(id, verifyDto.status);
  }
}
