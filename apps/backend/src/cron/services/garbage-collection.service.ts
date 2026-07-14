import { Injectable, Logger } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';
import { DeleteImageService } from '../../uploads/services/delete-image.service';

@Injectable()
export class GarbageCollectorService {
  private readonly logger = new Logger(GarbageCollectorService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly deleteImageService: DeleteImageService,
  ) {}

  async handleOrphanedImages() {
    this.logger.log('Iniciando recolección de basura de imágenes huérfanas...');

    try {
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

      const orphanedUploads = await this.prisma.pendingUpload.findMany({
        where: {
          createdAt: {
            lt: twentyFourHoursAgo,
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
        await this.deleteImageService.deleteImageFromSupabase(upload.url);

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
