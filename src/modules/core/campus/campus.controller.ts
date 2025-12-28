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
import { CreateCampusDto, UpdateCampusDto } from './dto';

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
