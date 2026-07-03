import { PartialType, OmitType, ApiPropertyOptional } from '@nestjs/swagger';
import { CreateTagDto } from './create-tag.dto';
import { IsOptional, IsString, Matches } from 'class-validator';

export class UpdateTagDto extends PartialType(
  OmitType(CreateTagDto, ['parentSlug'] as const),
) {
  @ApiPropertyOptional({
    description: 'Slug de la etiqueta padre (o null para volverla raíz)',
  })
  @IsOptional()
  @IsString()
  parentSlug?: string | null;

  @ApiPropertyOptional({
    description:
      'Slug de la etiqueta si el administrador quiere modificarlo manualmente',
  })
  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'El slug solo puede contener minúsculas, números y guiones',
  })
  slug?: string;
}
