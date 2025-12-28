import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from 'src/common/decorators';
import { AuthService } from './auth.service';
import {
  AuthResponseDto,
  BiometricLoginDto,
  EnableBiometricDto,
  LoginDto,
  RefreshTokenDto,
  RegisterDto,
} from './dto';
import { JwtAuthGuard } from './guards';

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
}
