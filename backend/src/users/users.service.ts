import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User, AuditLog, AuditAction, UserRole } from '../database/entities';
import { CreateUserDto, UpdateUserDto, QueryUserDto } from './dto';
import { NotificationsGateway } from '../websocket/notifications.gateway';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(AuditLog)
    private auditLogRepository: Repository<AuditLog>,
    private notificationsGateway: NotificationsGateway,
  ) {}

  async create(dto: CreateUserDto, actorId: string, ipAddress?: string) {
    const existing = await this.userRepository.findOne({
      where: { email: dto.email },
    });
    if (existing) throw new ConflictException('Email already registered');

    const hashed = await bcrypt.hash(dto.password, 12);
    const user = this.userRepository.create({ ...dto, password: hashed });
    await this.userRepository.save(user);

    await this.auditLogRepository.save(
      this.auditLogRepository.create({
        action: AuditAction.USER_CREATED,
        userId: actorId,
        ipAddress,
        description: `User created: ${user.email}`,
        metadata: { createdUserId: user.id },
      }),
    );

    this.notificationsGateway.notifyUserCreated(this.sanitizeUser(user));
    return this.sanitizeUser(user);
  }

  async findAll(query: QueryUserDto) {
    const { page = 1, limit = 10, search, role } = query;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (role) where.role = role;
    if (search) {
      const [byFirst, byLast, byEmail] = await Promise.all([
        this.userRepository.findAndCount({
          where: { firstName: Like(`%${search}%`), ...( role ? { role } : {}) },
          skip, take: limit, select: ['id','email','firstName','lastName','role','isActive','createdAt','updatedAt'],
        }),
        this.userRepository.findAndCount({
          where: { lastName: Like(`%${search}%`), ...( role ? { role } : {}) },
          skip, take: limit, select: ['id','email','firstName','lastName','role','isActive','createdAt','updatedAt'],
        }),
        this.userRepository.findAndCount({
          where: { email: Like(`%${search}%`), ...( role ? { role } : {}) },
          skip, take: limit, select: ['id','email','firstName','lastName','role','isActive','createdAt','updatedAt'],
        }),
      ]);
      const allUsers = [...byFirst[0], ...byLast[0], ...byEmail[0]];
      const unique = Array.from(new Map(allUsers.map(u => [u.id, u])).values());
      return { data: unique, total: unique.length, page, limit };
    }

    const [data, total] = await this.userRepository.findAndCount({
      where,
      skip,
      take: limit,
      select: ['id','email','firstName','lastName','role','isActive','createdAt','updatedAt'],
      order: { createdAt: 'DESC' },
    });

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: string) {
    const user = await this.userRepository.findOne({
      where: { id },
      select: ['id','email','firstName','lastName','role','isActive','createdAt','updatedAt'],
    });
    if (!user) throw new NotFoundException(`User with ID ${id} not found`);
    return user;
  }

  async update(
    id: string,
    dto: UpdateUserDto,
    actor: User,
    ipAddress?: string,
  ) {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) throw new NotFoundException(`User with ID ${id} not found`);

    if (actor.role !== UserRole.ADMIN && actor.id !== id) {
      throw new ForbiddenException('You can only update your own profile');
    }

    if (actor.role !== UserRole.ADMIN) {
      delete dto.role;
      delete dto.isActive;
    }

    if (dto.password) {
      dto.password = await bcrypt.hash(dto.password, 12);
    }

    await this.userRepository.update(id, dto);
    const updated = await this.findOne(id);

    await this.auditLogRepository.save(
      this.auditLogRepository.create({
        action: AuditAction.USER_UPDATED,
        userId: actor.id,
        ipAddress,
        description: `User updated: ${user.email}`,
        metadata: { updatedUserId: id },
      }),
    );

    this.notificationsGateway.notifyUserUpdated(updated);
    return updated;
  }

  async remove(id: string, actorId: string, ipAddress?: string) {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) throw new NotFoundException(`User with ID ${id} not found`);

    await this.userRepository.delete(id);

    await this.auditLogRepository.save(
      this.auditLogRepository.create({
        action: AuditAction.USER_DELETED,
        userId: actorId,
        ipAddress,
        description: `User deleted: ${user.email}`,
        metadata: { deletedUserId: id },
      }),
    );

    this.notificationsGateway.notifyUserDeleted(id);
    return { message: `User ${user.email} deleted successfully` };
  }

  private sanitizeUser(user: User) {
    const { password, ...result } = user as any;
    return result;
  }
}