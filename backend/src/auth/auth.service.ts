import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import {
  User,
  RefreshToken,
  TokenBlacklist,
  AuditLog,
  AuditAction,
} from '../database/entities';
import { RegisterDto, LoginDto } from './dto';
import { JwtPayload } from './strategies/jwt.strategy';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(RefreshToken)
    private refreshTokenRepository: Repository<RefreshToken>,
    @InjectRepository(TokenBlacklist)
    private tokenBlacklistRepository: Repository<TokenBlacklist>,
    @InjectRepository(AuditLog)
    private auditLogRepository: Repository<AuditLog>,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async register(dto: RegisterDto, ipAddress?: string) {
    const existing = await this.userRepository.findOne({
      where: { email: dto.email },
    });
    if (existing) throw new ConflictException('Email already registered');

    const hashed = await bcrypt.hash(dto.password, 12);
    const user = this.userRepository.create({ ...dto, password: hashed });
    await this.userRepository.save(user);

    await this.auditLogRepository.save(
      this.auditLogRepository.create({
        action: AuditAction.REGISTER,
        userId: user.id,
        ipAddress,
        description: `New user registered: ${user.email}`,
      }),
    );

    const tokens = await this.generateTokens(user);
    return { user: this.sanitizeUser(user), ...tokens };
  }

  async login(dto: LoginDto, ipAddress?: string) {
    const user = await this.userRepository.findOne({
      where: { email: dto.email, isActive: true },
    });

    if (!user || !(await bcrypt.compare(dto.password, user.password))) {
      await this.auditLogRepository.save(
        this.auditLogRepository.create({
          action: AuditAction.LOGIN_FAILED,
          ipAddress,
          description: `Failed login attempt for: ${dto.email}`,
          metadata: { email: dto.email },
        }),
      );
      throw new UnauthorizedException('Invalid email or password');
    }

    await this.auditLogRepository.save(
      this.auditLogRepository.create({
        action: AuditAction.LOGIN_SUCCESS,
        userId: user.id,
        ipAddress,
        description: `User logged in: ${user.email}`,
      }),
    );

    const tokens = await this.generateTokens(user);
    return { user: this.sanitizeUser(user), ...tokens };
  }

  async refresh(refreshToken: string, ipAddress?: string) {
    const blacklisted = await this.tokenBlacklistRepository.findOne({
      where: { token: refreshToken },
    });
    if (blacklisted) throw new UnauthorizedException('Token has been revoked');

    let payload: JwtPayload;
    try {
      payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get<string>('jwt.refreshSecret') ?? 'fallback_refresh',
      }) as JwtPayload;
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const storedToken = await this.refreshTokenRepository.findOne({
      where: { token: refreshToken, isRevoked: false },
      relations: ['user'],
    });
    if (!storedToken || storedToken.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token expired or not found');
    }

    storedToken.isRevoked = true;
    await this.refreshTokenRepository.save(storedToken);

    await this.auditLogRepository.save(
      this.auditLogRepository.create({
        action: AuditAction.TOKEN_REFRESHED,
        userId: payload.sub,
        ipAddress,
        description: 'Token refreshed',
      }),
    );

    return this.generateTokens(storedToken.user);
  }

  async logout(
    accessToken: string,
    refreshToken: string,
    userId: string,
    ipAddress?: string,
  ) {
    const accessDecoded = this.jwtService.decode(accessToken) as any;
    if (accessDecoded?.exp) {
      await this.tokenBlacklistRepository.save(
        this.tokenBlacklistRepository.create({
          token: accessToken,
          expiresAt: new Date(accessDecoded.exp * 1000),
        }),
      );
    }

    await this.tokenBlacklistRepository.save(
      this.tokenBlacklistRepository.create({
        token: refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      }),
    );

    await this.refreshTokenRepository.update(
      { userId, isRevoked: false },
      { isRevoked: true },
    );

    await this.auditLogRepository.save(
      this.auditLogRepository.create({
        action: AuditAction.LOGOUT,
        userId,
        ipAddress,
        description: 'User logged out',
      }),
    );

    return { message: 'Logged out successfully' };
  }

  async getProfile(userId: string) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('User not found');
    return this.sanitizeUser(user);
  }

  private async generateTokens(user: User) {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('jwt.secret') ?? 'fallback_secret',
      expiresIn: '15m',
    } as any);

    const refreshToken = this.jwtService.sign(payload, {
      secret:
        this.configService.get<string>('jwt.refreshSecret') ?? 'fallback_refresh',
      expiresIn: '7d',
    } as any);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await this.refreshTokenRepository.save(
      this.refreshTokenRepository.create({
        token: refreshToken,
        userId: user.id,
        expiresAt,
      }),
    );

    return { accessToken, refreshToken };
  }

  sanitizeUser(user: User) {
    const { password, ...result } = user as any;
    return result;
  }
}