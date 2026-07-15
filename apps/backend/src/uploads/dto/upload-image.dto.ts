import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsIn } from 'class-validator';

export class UploadImageDto {
  @ApiProperty({
    type: 'string',
    format: 'binary',
    description: 'El archivo de imagen (PNG, JPG, WEBP)',
  })
  @IsOptional()
  file?: Express.Multer.File;

  @ApiPropertyOptional({
    description: 'Ancho objetivo al que se escalará la imagen',
  })
  @IsOptional()
  targetWidth?: string | number;

  @ApiPropertyOptional({
    description: 'Alto objetivo al que se escalará la imagen',
  })
  @IsOptional()
  targetHeight?: string | number;

  @ApiPropertyOptional({
    description: 'Coordenada X del recorte (Desde la izquierda)',
  })
  @IsOptional()
  cropX?: string | number;

  @ApiPropertyOptional({
    description: 'Coordenada Y del recorte (Desde arriba)',
  })
  @IsOptional()
  cropY?: string | number;

  @ApiPropertyOptional({ description: 'Ancho del recorte' })
  @IsOptional()
  cropWidth?: string | number;

  @ApiPropertyOptional({ description: 'Alto del recorte' })
  @IsOptional()
  cropHeight?: string | number;

  @ApiPropertyOptional({
    enum: ['cover', 'contain', 'fill', 'inside', 'outside'],
    description: 'Modo de ajuste de Sharp si no encaja perfecto',
  })
  @IsOptional()
  @IsString()
  @IsIn(['cover', 'contain', 'fill', 'inside', 'outside'])
  fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
}
