import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from 'src/prisma';
import { AuthResponseDto, LoginDto, RegisterDto } from './dto';
import { JwtPayload } from './strategies/jwt.strategy';
import { EmailService } from 'src/modules/communication/email';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private emailService: EmailService,
  ) {}

  async register(registerDto: RegisterDto): Promise<AuthResponseDto> {
    const { email, password, firstName, lastName, phone, campusId } =
      registerDto;

    // Check if user exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Validate campus if provided
    if (campusId) {
      const campus = await this.prisma.campus.findUnique({
        where: { id: campusId },
      });
      if (!campus) {
        throw new BadRequestException('Invalid campus ID');
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await this.prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        firstName,
        lastName,
        phone,
        campusId,
      },
    });

    // Generate tokens
    const response = await this.generateTokens(user);

    // Send welcome email (fire and forget)
    this.emailService.sendWelcomeEmail(user.email, user.firstName).catch((err) => {
      // Log but don't fail registration if email fails
    });

    return response;
  }

  async login(loginDto: LoginDto): Promise<AuthResponseDto> {
    const { email, password } = loginDto;

    // Find user
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Generate tokens
    return this.generateTokens(user);
  }

  async refreshToken(refreshToken: string): Promise<AuthResponseDto> {
    // Find refresh token
    const storedToken = await this.prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: true },
    });

    if (!storedToken) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Check if token is expired
    if (storedToken.expiresAt < new Date()) {
      await this.prisma.refreshToken.delete({ where: { id: storedToken.id } });
      throw new UnauthorizedException('Refresh token expired');
    }

    // Delete old refresh token
    await this.prisma.refreshToken.delete({ where: { id: storedToken.id } });

    // Generate new tokens
    return this.generateTokens(storedToken.user);
  }

  async logout(userId: string, refreshToken: string): Promise<void> {
    await this.prisma.refreshToken.deleteMany({
      where: {
        userId,
        token: refreshToken,
      },
    });
  }

  async logoutAll(userId: string): Promise<void> {
    await this.prisma.refreshToken.deleteMany({
      where: { userId },
    });
  }

  async enableBiometric(
    userId: string,
    deviceId: string,
    platform: string,
  ): Promise<{ biometricToken: string }> {
    const biometricToken = uuidv4();
    const hashedToken = await bcrypt.hash(biometricToken, 10);

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        biometricToken: hashedToken,
        biometricDeviceId: deviceId,
      },
    });

    return { biometricToken };
  }

  async biometricLogin(
    biometricToken: string,
    deviceId: string,
  ): Promise<AuthResponseDto> {
    const user = await this.prisma.user.findFirst({
      where: { biometricDeviceId: deviceId },
    });

    if (!user || !user.biometricToken) {
      throw new UnauthorizedException('Biometric authentication not set up');
    }

    const isValid = await bcrypt.compare(biometricToken, user.biometricToken);
    if (!isValid) {
      throw new UnauthorizedException('Invalid biometric token');
    }

    return this.generateTokens(user);
  }

  async disableBiometric(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        biometricToken: null,
        biometricDeviceId: null,
      },
    });
  }

  private async generateTokens(user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    isVerified: boolean;
  }): Promise<AuthResponseDto> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    // Generate access token
    const accessToken = this.jwtService.sign(payload, {
      expiresIn: this.configService.get<string>('jwt.accessExpiration') as any,
    });

    // Generate refresh token
    const refreshToken = uuidv4();
    const refreshExpiration =
      this.configService.get<string>('jwt.refreshExpiration') || '7d';
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + parseInt(refreshExpiration));

    // Store refresh token
    await this.prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt,
      },
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role as any,
        isVerified: user.isVerified,
      },
    };
  }
}
