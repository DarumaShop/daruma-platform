import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';
import { randomUUID } from 'node:crypto';

export interface ProcessImageOptions {
  targetWidth?: number;
  targetHeight?: number;
  cropX?: number;
  cropY?: number;
  cropWidth?: number;
  cropHeight?: number;
  fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
}

@Injectable()
export class UploadImageService {
  private readonly logger = new Logger(UploadImageService.name);
  private readonly supabase: ReturnType<typeof createClient>;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
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

  async processAndUploadImage(
    file: { buffer: Buffer; originalname: string },
    options: ProcessImageOptions,
  ): Promise<string> {
    try {
      let imagePipeline = sharp(file.buffer);

      const parseNumber = (val: unknown) => {
        if (
          val === undefined ||
          val === null ||
          val === '' ||
          val === 'undefined'
        )
          return undefined;
        const num = Number(val);
        return Number.isNaN(num) ? undefined : num;
      };

      const cX = parseNumber(options.cropX);
      const cY = parseNumber(options.cropY);
      const cW = parseNumber(options.cropWidth);
      const cH = parseNumber(options.cropHeight);

      if (
        cX !== undefined &&
        cY !== undefined &&
        cW !== undefined &&
        cH !== undefined
      ) {
        imagePipeline = imagePipeline.extract({
          left: Math.round(cX),
          top: Math.round(cY),
          width: Math.round(cW),
          height: Math.round(cH),
        });
      }

      const tW = parseNumber(options.targetWidth);
      const tH = parseNumber(options.targetHeight);

      if (tW !== undefined || tH !== undefined) {
        imagePipeline = imagePipeline.resize({
          width: tW ? Math.round(tW) : undefined,
          height: tH ? Math.round(tH) : undefined,
          fit: options.fit || 'cover',
          withoutEnlargement: false,
        });
      }

      const processedBuffer = await imagePipeline
        .webp({ quality: 70, effort: 6 })
        .toBuffer();

      const uniqueId = randomUUID();
      const fileName = `${uniqueId}.webp`;
      const bucketName = 'products-images';

      const { data, error } = await this.supabase.storage
        .from(bucketName)
        .upload(fileName, processedBuffer, {
          contentType: 'image/webp',
          cacheControl: '3600',
          upsert: false,
        });

      if (error) {
        this.logger.error('Error subiendo imagen a Supabase', error);
        throw new InternalServerErrorException(
          'Fallo al subir la imagen al bucket',
        );
      }

      const { data: publicUrlData } = this.supabase.storage
        .from(bucketName)
        .getPublicUrl(data.path);

      await this.prisma.pendingUpload.create({
        data: { url: publicUrlData.publicUrl },
      });

      return publicUrlData.publicUrl;
    } catch (error) {
      this.logger.error('Error procesando imagen', error);
      throw error;
    }
  }
}
