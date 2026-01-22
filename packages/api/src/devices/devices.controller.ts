// MyRemote API - Devices Controller
// Handles HTTP requests for device management

import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { DevicesService } from './devices.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RBACGuard } from '../auth/guards/rbac.guard';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { ListDevicesDto, RevokeDeviceDto } from './dto';

@ApiTags('devices')
@ApiBearerAuth()
@Controller('devices')
@UseGuards(JwtAuthGuard, RBACGuard)
export class DevicesController {
  constructor(private readonly devicesService: DevicesService) {}

  /**
   * Liste des devices
   * GET /api/v1/devices?status=online&os_type=windows&page=1&limit=50
   */
  @Get()
  @RequirePermissions('devices:view')
  @ApiOperation({ summary: 'List devices with filters' })
  @ApiResponse({ status: 200, description: 'Devices list returned' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden (missing permission)' })
  async list(@Query() query: ListDevicesDto) {
    return await this.devicesService.list(query);
  }

  /**
   * Détail d'un device
   * GET /api/v1/devices/:id
   */
  @Get(':id')
  @RequirePermissions('devices:view')
  @ApiOperation({ summary: 'Get device detail' })
  @ApiResponse({ status: 200, description: 'Device detail returned' })
  @ApiResponse({ status: 404, description: 'Device not found' })
  async findOne(@Param('id') id: string) {
    return await this.devicesService.findOne(id);
  }

  /**
   * Révoquer un device
   * POST /api/v1/devices/:id/revoke
   */
  @Post(':id/revoke')
  @RequirePermissions('devices:revoke')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Revoke device (disable agent)' })
  @ApiResponse({ status: 200, description: 'Device revoked' })
  @ApiResponse({ status: 404, description: 'Device not found' })
  async revoke(
    @Param('id') id: string,
    @Body() dto: RevokeDeviceDto,
    @Request() req,
  ) {
    return await this.devicesService.revoke(id, dto.reason, req.user.id);
  }

  /**
   * Statistiques devices
   * GET /api/v1/devices/stats
   */
  @Get('stats/overview')
  @RequirePermissions('devices:view')
  @ApiOperation({ summary: 'Get devices statistics' })
  @ApiResponse({ status: 200, description: 'Statistics returned' })
  async stats() {
    return await this.devicesService.getStats();
  }
}
