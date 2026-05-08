import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { Roles } from 'src/common/decorators';
import { RolesGuard } from 'src/common/guards';
import { JwtAuthGuard } from 'src/modules/identity/auth/guards';
import { CampusService } from './campus.service';
import { CreateCampusDto, CreatePickupLocationDto, UpdateCampusDto } from './dto';

@ApiTags('Campus')
@Controller('campuses')
export class CampusController {
  constructor(private readonly campusService: CampusService) {}

  @Get()
  @ApiOperation({ summary: 'List all campuses' })
  async findAll(@Query('includeInactive') includeInactive?: string) {
    return this.campusService.findAll(includeInactive === 'true');
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get campus by ID' })
  async findById(@Param('id') id: string) {
    return this.campusService.findById(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, 'SUPER_ADMIN' as any)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new campus (Admin or Super Admin)' })
  async create(@Body() createDto: CreateCampusDto) {
    return this.campusService.create(createDto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, 'SUPER_ADMIN' as any)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update campus (Admin or Super Admin)' })
  async update(@Param('id') id: string, @Body() updateDto: UpdateCampusDto) {
    return this.campusService.update(id, updateDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete campus (Admin only)' })
  async delete(@Param('id') id: string) {
    return this.campusService.delete(id);
  }

  @Get(':id/pickup-locations')
  @ApiOperation({ summary: 'Get pickup locations for a campus (public)' })
  async getPickupLocations(@Param('id') id: string) {
    return this.campusService.getPickupLocations(id);
  }

  @Post(':id/pickup-locations')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN' as any)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add a pickup location to a campus (Super Admin)' })
  async addPickupLocation(
    @Param('id') id: string,
    @Body() dto: CreatePickupLocationDto,
  ) {
    return this.campusService.addPickupLocation(id, dto);
  }

  @Delete(':id/pickup-locations/:locationId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN' as any)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Remove a pickup location from a campus (Super Admin)' })
  async removePickupLocation(
    @Param('id') id: string,
    @Param('locationId') locationId: string,
  ) {
    return this.campusService.removePickupLocation(id, locationId);
  }
}
