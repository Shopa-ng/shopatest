import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CampusService } from './campus.service';
import { CreateCampusDto, UpdateCampusDto } from './dto';
import { JwtAuthGuard } from '../auth/guards';
import { RolesGuard } from '../../common/guards';
import { Roles } from '../../common/decorators';
import { UserRole } from '@prisma/client';

@ApiTags('Campus')
@Controller('campuses')
export class CampusController {
  constructor(private readonly campusService: CampusService) {}

  @Get()
  @ApiOperation({ summary: 'List all campuses' })
  async findAll(@Query('activeOnly') activeOnly?: boolean) {
    return this.campusService.findAll(activeOnly ?? true);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get campus by ID' })
  async findById(@Param('id') id: string) {
    return this.campusService.findById(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new campus (Admin only)' })
  async create(@Body() createDto: CreateCampusDto) {
    return this.campusService.create(createDto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update campus (Admin only)' })
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
}
