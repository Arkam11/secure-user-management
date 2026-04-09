import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User, AuditLog, UserRole } from '../database/entities';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { NotificationsGateway } from '../websocket/notifications.gateway';

const mockUser: User = {
  id: 'user-uuid-123',
  email: 'user@test.com',
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

const mockAdminUser: User = {
  ...mockUser,
  id: 'admin-uuid-123',
  email: 'admin@test.com',
  role: UserRole.ADMIN,
};

const mockUserRepo = {
  findOne: jest.fn(),
  findAndCount: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};

const mockAuditLogRepo = {
  create: jest.fn(),
  save: jest.fn(),
};

const mockGateway = {
  notifyUserCreated: jest.fn(),
  notifyUserUpdated: jest.fn(),
  notifyUserDeleted: jest.fn(),
};

describe('UsersService', () => {
  let service: UsersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getRepositoryToken(User), useValue: mockUserRepo },
        { provide: getRepositoryToken(AuditLog), useValue: mockAuditLogRepo },
        { provide: NotificationsGateway, useValue: mockGateway },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    jest.clearAllMocks();
  });

  describe('findOne', () => {
    it('should return a user by id', async () => {
      mockUserRepo.findOne.mockResolvedValue(mockUser);
      const result = await service.findOne('user-uuid-123');
      expect(result.email).toBe('user@test.com');
    });

    it('should throw NotFoundException if user not found', async () => {
      mockUserRepo.findOne.mockResolvedValue(null);
      await expect(service.findOne('bad-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('should create a user and send WebSocket notification', async () => {
      mockUserRepo.findOne.mockResolvedValue(null);
      mockUserRepo.create.mockReturnValue(mockUser);
      mockUserRepo.save.mockResolvedValue(mockUser);
      mockAuditLogRepo.create.mockReturnValue({});
      mockAuditLogRepo.save.mockResolvedValue({});

      await service.create(
        {
          firstName: 'Test',
          lastName: 'User',
          email: 'user@test.com',
          password: 'Test123!',
        },
        mockAdminUser.id,
      );

      expect(mockGateway.notifyUserCreated).toHaveBeenCalledTimes(1);
    });

    it('should throw ConflictException if email exists', async () => {
      mockUserRepo.findOne.mockResolvedValue(mockUser);
      await expect(
        service.create(
          { firstName: 'T', lastName: 'U', email: 'user@test.com', password: 'Test123!' },
          mockAdminUser.id,
        ),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('remove', () => {
    it('should delete user and send WebSocket notification', async () => {
      mockUserRepo.findOne.mockResolvedValue(mockUser);
      mockUserRepo.delete.mockResolvedValue({});
      mockAuditLogRepo.create.mockReturnValue({});
      mockAuditLogRepo.save.mockResolvedValue({});

      await service.remove('user-uuid-123', mockAdminUser.id);
      expect(mockGateway.notifyUserDeleted).toHaveBeenCalledWith('user-uuid-123');
    });

    it('should throw NotFoundException if user not found', async () => {
      mockUserRepo.findOne.mockResolvedValue(null);
      await expect(
        service.remove('bad-id', mockAdminUser.id),
      ).rejects.toThrow(NotFoundException);
    });
  });
});