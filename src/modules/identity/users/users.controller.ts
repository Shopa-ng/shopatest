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
import { UserRole, VerificationStatus } from '@prisma/client';
import { CurrentUser, Roles } from 'src/common/decorators';
import { RolesGuard } from 'src/common/guards';
import { JwtAuthGuard } from 'src/modules/identity/auth/guards';
import { UpdateUserDto, UploadStudentIdDto } from './dto';
import { UsersService } from './users.service';

@ApiTags('Users')
@Controller('users')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  async getMe(@CurrentUser('id') userId: string) {
    return this.usersService.findById(userId);
  }

  @Patch('me')
  @ApiOperation({ summary: 'Update current user profile' })
  async updateMe(
    @CurrentUser('id') userId: string,
    @Body() updateDto: UpdateUserDto,
  ) {
    return this.usersService.updateProfile(userId, updateDto);
  }

  @Post('upload-student-id')
  @ApiOperation({ summary: 'Upload student ID for verification' })
  async uploadStudentId(
    @CurrentUser('id') userId: string,
    @Body() uploadDto: UploadStudentIdDto,
  ) {
    return this.usersService.uploadStudentId(userId, uploadDto);
  }

  // Admin endpoints
  @Get('pending-verifications')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get pending user verifications (Admin only)' })
  async getPendingVerifications(@Query('campusId') campusId?: string) {
    return this.usersService.findPendingVerifications(campusId);
  }

  @Patch(':id/verify')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Verify/reject user (Admin only)' })
  async verifyUser(
    @Param('id') id: string,
    @Body('status') status: VerificationStatus,
  ) {
    return this.usersService.verifyUser(id, status);
  }
}
