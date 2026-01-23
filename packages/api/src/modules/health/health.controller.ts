import { Controller, Get } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Controller('health')
export class HealthController {
  constructor(private readonly database: DatabaseService) {}

  @Get()
  async check() {
    const dbStatus = await this.checkDatabase();
    
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: dbStatus,
    };
  }

  @Get('ready')
  async ready() {
    const dbReady = await this.checkDatabase();
    
    if (dbReady === 'connected') {
      return { status: 'ready' };
    }
    
    throw new Error('Database not ready');
  }

  private async checkDatabase(): Promise<string> {
    try {
      await this.database.$queryRaw`SELECT 1`;
      return 'connected';
    } catch (error) {
      return 'disconnected';
    }
  }
}
