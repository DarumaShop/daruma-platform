import { Injectable, Logger } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { UploadsService } from '../uploads/uploads.service';

@Injectable()
export class GarbageCollectorService {
  private readonly logger = new Logger(GarbageCollectorService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly uploadsService: UploadsService,
  ) {}

  async handleOrphanedImages() {
    this.logger.log('Iniciando recolección de basura de imágenes huérfanas...');

    try {
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000); // 10 minutos para pruebas

      const orphanedUploads = await this.prisma.pendingUpload.findMany({
        where: {
          createdAt: {
            lt: tenMinutesAgo,
          },
        },
      });

      if (orphanedUploads.length === 0) {
        this.logger.log('No se encontraron imágenes huérfanas.');
        return;
      }

      this.logger.log(
        `Encontradas ${orphanedUploads.length} imágenes huérfanas. Procediendo a eliminar...`,
      );

      for (const upload of orphanedUploads) {
        await this.uploadsService.deleteImageFromSupabase(upload.url);

        await this.prisma.pendingUpload.delete({
          where: { id: upload.id },
        });
      }

      this.logger.log('Recolección de basura completada exitosamente.');
    } catch (error) {
      this.logger.error('Error durante la recolección de basura', error);
    }
  }
}
