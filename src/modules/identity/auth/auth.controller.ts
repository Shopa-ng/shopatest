import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { IsString, IsEmail } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { CurrentUser, Roles } from 'src/common/decorators';
import { RolesGuard } from 'src/common/guards';
import { AuthService } from './auth.service';
import {
  AuthResponseDto,
  BiometricLoginDto,
  EnableBiometricDto,
  ForgotPasswordDto,
  LoginDto,
  RefreshTokenDto,
  RegisterDto,
  ResetPasswordDto,
} from './dto';
import { GoogleAuthGuard, JwtAuthGuard } from './guards';

class CreateAdminDto {
  @ApiProperty({ example: 'admin@university.edu.ng' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'John' })
  @IsString()
  firstName: string;

  @ApiProperty({ example: 'Doe' })
  @IsString()
  lastName: string;

  @ApiProperty({ example: 'campus-uuid' })
  @IsString()
  campusId: string;

  @ApiProperty({ example: 'Admin@1234' })
  @IsString()
  password: string;
}

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({
    status: 201,
    description: 'User registered successfully',
    type: AuthResponseDto,
  })
  @ApiResponse({ status: 409, description: 'User already exists' })
  async register(@Body() registerDto: RegisterDto): Promise<AuthResponseDto> {
    return this.authService.register(registerDto);
  }

  @Post('admin/create')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN' as any)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a university admin account (Super Admin only)' })
  @ApiResponse({ status: 201, description: 'Admin account created successfully' })
  async createAdmin(
    @Body() dto: CreateAdminDto,
  ): Promise<{ message: string; email: string }> {
    return this.authService.createAdmin(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiResponse({
    status: 200,
    description: 'Login successful',
    type: AuthResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(@Body() loginDto: LoginDto): Promise<AuthResponseDto> {
    return this.authService.login(loginDto);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiResponse({
    status: 200,
    description: 'Token refreshed successfully',
    type: AuthResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Invalid or expired refresh token' })
  async refreshToken(
    @Body() refreshTokenDto: RefreshTokenDto,
  ): Promise<AuthResponseDto> {
    return this.authService.refreshToken(refreshTokenDto.refreshToken);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout current session' })
  @ApiResponse({ status: 200, description: 'Logged out successfully' })
  async logout(
    @CurrentUser('id') userId: string,
    @Body() refreshTokenDto: RefreshTokenDto,
  ): Promise<{ message: string }> {
    await this.authService.logout(userId, refreshTokenDto.refreshToken);
    return { message: 'Logged out successfully' };
  }

  @Post('logout-all')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout all sessions' })
  @ApiResponse({
    status: 200,
    description: 'All sessions logged out successfully',
  })
  async logoutAll(
    @CurrentUser('id') userId: string,
  ): Promise<{ message: string }> {
    await this.authService.logoutAll(userId);
    return { message: 'All sessions logged out successfully' };
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request password reset email' })
  @ApiResponse({ status: 200, description: 'Reset email sent if account exists' })
  async forgotPassword(
    @Body() dto: ForgotPasswordDto,
  ): Promise<{ message: string }> {
    return this.authService.forgotPassword(dto.email);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset password using token from email' })
  @ApiResponse({ status: 200, description: 'Password reset successfully' })
  async resetPassword(
    @Body() dto: ResetPasswordDto,
  ): Promise<{ message: string }> {
    return this.authService.resetPassword(dto.token, dto.password);
  }

  @Post('biometric/enable')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Enable biometric authentication for device' })
  @ApiResponse({ status: 200, description: 'Biometric enabled successfully' })
  async enableBiometric(
    @CurrentUser('id') userId: string,
    @Body() dto: EnableBiometricDto,
  ): Promise<{ biometricToken: string }> {
    return this.authService.enableBiometric(userId, dto.deviceId, dto.platform);
  }

  @Post('biometric/login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login using biometric authentication' })
  @ApiResponse({
    status: 200,
    description: 'Biometric login successful',
    type: AuthResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Invalid biometric token' })
  async biometricLogin(
    @Body() dto: BiometricLoginDto,
  ): Promise<AuthResponseDto> {
    return this.authService.biometricLogin(dto.biometricToken, dto.deviceId);
  }

  @Post('biometric/disable')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Disable biometric authentication' })
  @ApiResponse({ status: 200, description: 'Biometric disabled successfully' })
  async disableBiometric(
    @CurrentUser('id') userId: string,
  ): Promise<{ message: string }> {
    await this.authService.disableBiometric(userId);
    return { message: 'Biometric authentication disabled' };
  }

  @Get('google')
  @UseGuards(GoogleAuthGuard)
  @ApiOperation({ summary: 'Initiate Google OAuth login' })
  async googleAuth() {
    // Guard automatically redirects to Google
  }

  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  @ApiOperation({ summary: 'Google OAuth callback' })
  async googleAuthCallback(@Req() req: any, @Res() res: any) {
    const result = await this.authService.generateTokensForOAuth(req.user);
    const { accessToken, refreshToken } = result;
    const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:3000';
    return res.redirect(
      `${frontendUrl}/auth/google/callback?accessToken=${accessToken}&refreshToken=${refreshToken}`,
    );
  }
}