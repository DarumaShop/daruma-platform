import { ApiPropertyOptional } from '@nestjs/swagger';
import { ProductType } from '@prisma/client';

export enum PageCount {
  PAGES_60 = 'PAGES_60',
  PAGES_80 = 'PAGES_80',
  PAGES_100 = 'PAGES_100',
}

export enum PaperType {
  GRID = 'GRID',
  LINED = 'LINED',
  BLANK = 'BLANK',
}

export enum PosterSize {
  SMALL = 'SMALL',
  MEDIUM = 'MEDIUM',
  LARGE = 'LARGE',
}
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';

export class GetProductsFilterDto {
  @ApiPropertyOptional({ description: 'Página actual', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ description: 'Elementos por página', default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;

  @ApiPropertyOptional({ description: 'Filtrar por nombre o descripción' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Ordenar resultados',
    enum: ['NEWEST', 'PRICE_ASC', 'PRICE_DESC'],
  })
  @IsOptional()
  @IsEnum(['NEWEST', 'PRICE_ASC', 'PRICE_DESC'])
  orderBy?: 'NEWEST' | 'PRICE_ASC' | 'PRICE_DESC';

  @ApiPropertyOptional({ description: 'Filtrar por productos destacados' })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isFeatured?: boolean;

  @ApiPropertyOptional({ description: 'Filtrar por productos en oferta' })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  onSale?: boolean;

  @ApiPropertyOptional({ enum: ProductType, description: 'Filtrar por tipo' })
  @IsOptional()
  @IsEnum(ProductType)
  type?: ProductType;

  @ApiPropertyOptional({ description: 'ID de la etiqueta para filtrar' })
  @IsOptional()
  @IsString()
  tagId?: string;

  @ApiPropertyOptional({
    description:
      'Slug de la etiqueta para filtrar (ideal para URLs limpias en Frontend)',
  })
  @IsOptional()
  @IsString()
  tagSlug?: string;

  @ApiPropertyOptional({
    enum: PageCount,
    description: 'Filtrar por número de hojas',
  })
  @IsOptional()
  @IsEnum(PageCount)
  pageCount?: PageCount;

  @ApiPropertyOptional({
    enum: PaperType,
    description: 'Filtrar por tipo de papel',
  })
  @IsOptional()
  @IsEnum(PaperType)
  paperType?: PaperType;

  @ApiPropertyOptional({
    enum: PosterSize,
    description: 'Filtrar por tamaño de póster',
  })
  @IsOptional()
  @IsEnum(PosterSize)
  posterSize?: PosterSize;
}
