import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient } from '@supabase/supabase-js';

@Injectable()
export class DeleteImageService {
  private readonly logger = new Logger(DeleteImageService.name);
  private readonly supabase: ReturnType<typeof createClient>;

  constructor(private readonly configService: ConfigService) {
    const supabaseUrl = this.configService.get<string>('SUPABASE_URL');
    const supabaseKey = this.configService.get<string>(
      'SUPABASE_SERVICE_ROLE_KEY',
    );

    if (!supabaseUrl || !supabaseKey) {
      throw new Error(
        'Las credenciales de Supabase no están configuradas en el entorno.',
      );
    }

    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  async deleteImageFromSupabase(url: string): Promise<void> {
    try {
      const bucketName = 'products-images';
      const urlParts = url.split(`/${bucketName}/`);
      if (urlParts.length === 2) {
        const filePath = urlParts[1];
        const { error } = await this.supabase.storage
          .from(bucketName)
          .remove([filePath]);

        if (error) {
          this.logger.warn(
            `No se pudo eliminar la imagen de Supabase: ${filePath}`,
            error,
          );
        } else {
          this.logger.log(`Imagen eliminada de Supabase: ${filePath}`);
        }
      }
    } catch (error) {
      this.logger.error('Error al intentar eliminar imagen de Supabase', error);
    }
  }
}
