import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator';

export class CreateTagDto {
  @ApiProperty({ description: 'Nombre visible de la etiqueta' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({ description: 'Slug único para URLs (Ej. libretas-rayadas)' })
  @IsNotEmpty()
  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'El slug solo puede contener minúsculas, números y guiones',
  })
  slug: string;

  @ApiPropertyOptional({
    description: 'ID de la etiqueta padre, si es una subcategoría',
  })
  @IsOptional()
  @IsString()
  parentId?: string;
}
