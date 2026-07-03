import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator';

export class CreateTagDto {
  @ApiProperty({ description: 'Nombre visible de la etiqueta' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiPropertyOptional({
    description: 'Slug de la etiqueta padre, si es una subcategoría',
  })
  @IsOptional()
  @IsString()
  parentSlug?: string;
}
