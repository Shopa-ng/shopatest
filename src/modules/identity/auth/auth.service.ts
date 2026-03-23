import { EmailService } from 'src/modules/communication/email';
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

    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    if (campusId) {
      const campus = await this.prisma.campus.findUnique({
        where: { id: campusId },
      });
      if (!campus) {
        throw new BadRequestException('Invalid campus ID');
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);

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

    return this.generateTokens(user);
  }

  async login(loginDto: LoginDto): Promise<AuthResponseDto> {
    const { email, password } = loginDto;

    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.generateTokens(user);
  }

  async googleLogin(profile: {
    googleId: string;
    email: string;
    firstName: string;
    lastName: string;
    avatar?: string;
  }): Promise<AuthResponseDto> {
    const { googleId, email, firstName, lastName, avatar } = profile;

    let user = await this.prisma.user.findFirst({
      where: {
        OR: [{ googleId }, { email }],
      },
    });

    if (user) {
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: {
          googleId: user.googleId ?? googleId,
          avatar: user.avatar ?? avatar,
        },
      });
    } else {
      user = await this.prisma.user.create({
        data: {
          email,
          firstName,
          lastName,
          avatar,
          googleId,
          password: '',
          isEmailVerified: true,
          verificationStatus: 'APPROVED',
          isVerified: true,
        },
      });
    }

    return this.generateTokens(user);
  }

  async forgotPassword(email: string): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({ where: { email } });

    // Always return success to prevent email enumeration
    if (!user) {
      return { message: 'If that email exists, a reset link has been sent' };
    }

    // Invalidate any existing reset tokens
    // @ts-ignore
    await this.prisma.passwordResetToken.deleteMany({
      where: { userId: user.id },
    });

    // Create new reset token
    const token = uuidv4();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);

    // @ts-ignore
    await this.prisma.passwordResetToken.create({
      data: { token, userId: user.id, expiresAt },
    });

    await this.emailService.sendPasswordReset(user.email, token);

    return { message: 'If that email exists, a reset link has been sent' };
  }

  async resetPassword(
    token: string,
    password: string,
  ): Promise<{ message: string }> {
    // @ts-ignore
    const resetToken = await this.prisma.passwordResetToken.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!resetToken) {
      throw new UnauthorizedException('Invalid or expired reset token');
    }

    if (resetToken.used) {
      throw new UnauthorizedException('Reset token has already been used');
    }

    if (resetToken.expiresAt < new Date()) {
      // @ts-ignore
      await this.prisma.passwordResetToken.delete({
        where: { id: resetToken.id },
      });
      throw new UnauthorizedException('Reset token has expired');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await this.prisma.user.update({
      where: { id: resetToken.userId },
      data: { password: hashedPassword },
    });

    // @ts-ignore
    await this.prisma.passwordResetToken.update({
      where: { id: resetToken.id },
      data: { used: true },
    });

    // Invalidate all refresh tokens for security
    await this.prisma.refreshToken.deleteMany({
      where: { userId: resetToken.userId },
    });

    return { message: 'Password reset successfully' };
  }

  async generateTokensForOAuth(user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    isVerified: boolean;
  }): Promise<AuthResponseDto> {
    return this.generateTokens(user);
  }

  async refreshToken(refreshToken: string): Promise<AuthResponseDto> {
    const storedToken = await this.prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: true },
    });

    if (!storedToken) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (storedToken.expiresAt < new Date()) {
      await this.prisma.refreshToken.delete({ where: { id: storedToken.id } });
      throw new UnauthorizedException('Refresh token expired');
    }

    await this.prisma.refreshToken.delete({ where: { id: storedToken.id } });

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

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: this.configService.get<string>('jwt.accessExpiration'),
    });

    const refreshToken = uuidv4();
    const refreshExpiration =
      this.configService.get<string>('jwt.refreshExpiration') || '7d';
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + parseInt(refreshExpiration));

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