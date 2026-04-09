import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { User, RefreshToken, TokenBlacklist, AuditLog, UserRole } from '../database/entities';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

const mockUser: User = {
  id: 'test-uuid-123',
  email: 'test@test.com',
  password: 'hashedpassword',
  firstName: 'Test',
  lastName: 'User',
  role: UserRole.USER,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  refreshTokens: [],
  auditLogs: [],
};

const mockUserRepo = {
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  update: jest.fn(),
};

const mockRefreshTokenRepo = {
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  update: jest.fn(),
};

const mockTokenBlacklistRepo = {
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
};

const mockAuditLogRepo = {
  create: jest.fn(),
  save: jest.fn(),
};

const mockJwtService = {
  sign: jest.fn().mockReturnValue('mock-token'),
  verify: jest.fn(),
  decode: jest.fn(),
};

const mockConfigService = {
  get: jest.fn().mockReturnValue('test-secret'),
};

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(User), useValue: mockUserRepo },
        { provide: getRepositoryToken(RefreshToken), useValue: mockRefreshTokenRepo },
        { provide: getRepositoryToken(TokenBlacklist), useValue: mockTokenBlacklistRepo },
        { provide: getRepositoryToken(AuditLog), useValue: mockAuditLogRepo },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should register a new user successfully', async () => {
      mockUserRepo.findOne.mockResolvedValue(null);
      mockUserRepo.create.mockReturnValue(mockUser);
      mockUserRepo.save.mockResolvedValue(mockUser);
      mockAuditLogRepo.create.mockReturnValue({});
      mockAuditLogRepo.save.mockResolvedValue({});
      mockRefreshTokenRepo.create.mockReturnValue({});
      mockRefreshTokenRepo.save.mockResolvedValue({});

      const result = await service.register({
        firstName: 'Test',
        lastName: 'User',
        email: 'test@test.com',
        password: 'Test123!',
      });

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result.user).not.toHaveProperty('password');
    });

    it('should throw ConflictException if email already exists', async () => {
      mockUserRepo.findOne.mockResolvedValue(mockUser);

      await expect(
        service.register({
          firstName: 'Test',
          lastName: 'User',
          email: 'test@test.com',
          password: 'Test123!',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('login', () => {
    it('should login successfully with correct credentials', async () => {
      const hashedPassword = await bcrypt.hash('Test123!', 12);
      mockUserRepo.findOne.mockResolvedValue({ ...mockUser, password: hashedPassword });
      mockAuditLogRepo.create.mockReturnValue({});
      mockAuditLogRepo.save.mockResolvedValue({});
      mockRefreshTokenRepo.create.mockReturnValue({});
      mockRefreshTokenRepo.save.mockResolvedValue({});

      const result = await service.login({
        email: 'test@test.com',
        password: 'Test123!',
      });

      expect(result).toHaveProperty('accessToken');
      expect(result.user.email).toBe('test@test.com');
    });

    it('should throw UnauthorizedException with wrong password', async () => {
      mockUserRepo.findOne.mockResolvedValue(mockUser);
      mockAuditLogRepo.create.mockReturnValue({});
      mockAuditLogRepo.save.mockResolvedValue({});

      await expect(
        service.login({ email: 'test@test.com', password: 'WrongPass!' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if user not found', async () => {
      mockUserRepo.findOne.mockResolvedValue(null);
      mockAuditLogRepo.create.mockReturnValue({});
      mockAuditLogRepo.save.mockResolvedValue({});

      await expect(
        service.login({ email: 'notfound@test.com', password: 'Test123!' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('getProfile', () => {
    it('should return user profile without password', async () => {
      mockUserRepo.findOne.mockResolvedValue(mockUser);
      const result = await service.getProfile('test-uuid-123');
      expect(result).not.toHaveProperty('password');
      expect(result.email).toBe('test@test.com');
    });

    it('should throw UnauthorizedException if user not found', async () => {
      mockUserRepo.findOne.mockResolvedValue(null);
      await expect(service.getProfile('bad-id')).rejects.toThrow(UnauthorizedException);
    });
  });
});