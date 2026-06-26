import {
  Controller,
  Get,
  Headers,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GarbageCollectorService } from './garbage-collector.service';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';

@ApiTags('Crons')
@Controller('crons')
export class CronController {
  constructor(
    private readonly configService: ConfigService,
    private readonly garbageCollectorService: GarbageCollectorService,
  ) {}

  @Get('garbage-collection')
  @ApiOperation({
    summary: 'Ejecuta el recolector de basura de imágenes huérfanas',
    description: 'Endpoint reservado para Vercel Crons',
  })
  @ApiResponse({ status: 200, description: 'Recolección ejecutada' })
  @ApiResponse({ status: 401, description: 'Acceso no autorizado' })
  @ApiBearerAuth()
  @ApiTags('Crons')
  async triggerGarbageCollection(@Headers('authorization') authHeader: string) {
    const cronSecret = this.configService.get<string>('CRON_SECRET')?.trim();
    const token = authHeader?.replace('Bearer ', '')?.trim();

    if (!token || token !== cronSecret) {
      throw new UnauthorizedException('Acceso denegado al cron');
    }

    await this.garbageCollectorService.handleOrphanedImages();

    return { success: true, message: 'Recolección de basura iniciada' };
  }
}
