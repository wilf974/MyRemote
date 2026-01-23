import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CreateUserDto, UpdateUserDto, UserStatus } from '@myremote/shared';
import { KeycloakService } from '../auth/keycloak.service';
import { AuditAction, AuditSeverity } from '@myremote/shared';

@Injectable()
export class UsersService {
  constructor(
    private readonly database: DatabaseService,
    private readonly keycloakService: KeycloakService,
  ) {}

  /**
   * Get all users with optional filters
   */
  async findAll(filters?: {
    role?: string;
    status?: UserStatus;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const page = filters?.page || 1;
    const limit = filters?.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (filters?.role) {
      where.role = filters.role;
    }

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.search) {
      where.OR = [
        { email: { contains: filters.search, mode: 'insensitive' } },
        { firstName: { contains: filters.search, mode: 'insensitive' } },
        { lastName: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const [users, total] = await Promise.all([
      this.database.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          status: true,
          keycloakId: true,
          twoFactorEnabled: true,
          lastLoginAt: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      this.database.user.count({ where }),
    ]);

    return {
      data: users,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get user by ID
   */
  async findOne(id: string) {
    const user = await this.database.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        status: true,
        keycloakId: true,
        twoFactorEnabled: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  /**
   * Create new user (also creates in Keycloak)
   */
  async create(createUserDto: CreateUserDto, createdBy: string) {
    // Check if user already exists
    const existingUser = await this.database.user.findUnique({
      where: { email: createUserDto.email },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // TODO: Create user in Keycloak first
    // For now, we'll use a placeholder keycloakId
    const keycloakId = `temp-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    // Create user in database
    const user = await this.database.user.create({
      data: {
        email: createUserDto.email,
        firstName: createUserDto.firstName,
        lastName: createUserDto.lastName,
        role: createUserDto.role,
        status: UserStatus.ACTIVE,
        keycloakId,
        twoFactorEnabled: false,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        status: true,
        keycloakId: true,
        twoFactorEnabled: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Create audit log
    await this.database.auditLog.create({
      data: {
        action: AuditAction.USER_CREATE,
        severity: AuditSeverity.INFO,
        userId: createdBy,
        ipAddress: '0.0.0.0',
        userAgent: 'system',
        metadata: {
          createdUserId: user.id,
          email: user.email,
        },
      },
    });

    return user;
  }

  /**
   * Update user
   */
  async update(id: string, updateUserDto: UpdateUserDto, updatedBy: string) {
    const user = await this.database.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const updatedUser = await this.database.user.update({
      where: { id },
      data: updateUserDto,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        status: true,
        keycloakId: true,
        twoFactorEnabled: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Create audit log
    await this.database.auditLog.create({
      data: {
        action: AuditAction.USER_UPDATE,
        severity: AuditSeverity.INFO,
        userId: updatedBy,
        ipAddress: '0.0.0.0',
        userAgent: 'system',
        metadata: {
          updatedUserId: id,
          changes: updateUserDto,
        },
      },
    });

    return updatedUser;
  }

  /**
   * Delete user (soft delete - set status to INACTIVE)
   */
  async remove(id: string, deletedBy: string) {
    const user = await this.database.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.id === deletedBy) {
      throw new BadRequestException('Cannot delete your own account');
    }

    await this.database.user.update({
      where: { id },
      data: { status: UserStatus.INACTIVE },
    });

    // Create audit log
    await this.database.auditLog.create({
      data: {
        action: AuditAction.USER_DELETE,
        severity: AuditSeverity.WARNING,
        userId: deletedBy,
        ipAddress: '0.0.0.0',
        userAgent: 'system',
        metadata: {
          deletedUserId: id,
          email: user.email,
        },
      },
    });

    return { message: 'User deleted successfully' };
  }

  /**
   * Get user statistics
   */
  async getStats() {
    const [total, active, inactive, suspended] = await Promise.all([
      this.database.user.count(),
      this.database.user.count({ where: { status: UserStatus.ACTIVE } }),
      this.database.user.count({ where: { status: UserStatus.INACTIVE } }),
      this.database.user.count({ where: { status: UserStatus.SUSPENDED } }),
    ]);

    const roleDistribution = await this.database.user.groupBy({
      by: ['role'],
      _count: true,
    });

    return {
      total,
      byStatus: {
        active,
        inactive,
        suspended,
      },
      byRole: roleDistribution.map((r) => ({
        role: r.role,
        count: r._count,
      })),
    };
  }
}
