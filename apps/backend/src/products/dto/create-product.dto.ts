import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ProductType } from '@prisma/client';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsArray,
  ValidateNested,
  Min,
  IsBoolean,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PageCount, PaperType, PosterSize } from './get-products-filter.dto';

// ==========================================
// DETALLES COMUNES (Padre)
// ==========================================

export class NotebookDetailsDto {
  @ApiProperty({ description: 'Largo en cm' })
  @IsInt()
  length: number;

  @ApiProperty({ description: 'Ancho en cm' })
  @IsInt()
  width: number;

  @ApiProperty({ description: 'Alto en cm' })
  @IsInt()
  height: number;
}

export class NotepadDetailsDto {
  @ApiProperty({ description: 'Largo en cm' })
  @IsInt()
  length: number;

  @ApiProperty({ description: 'Ancho en cm' })
  @IsInt()
  width: number;

  @ApiProperty({ description: 'Alto en cm' })
  @IsInt()
  height: number;
}

export class PosterDetailsDto {
  @ApiProperty({ description: 'Ancho en cm' })
  @IsInt()
  width: number;

  @ApiProperty({ description: 'Alto en cm' })
  @IsInt()
  height: number;
}

// ==========================================
// DETALLES DE VARIANTE
// ==========================================

export class NotebookVariantDetailsDto {
  @ApiProperty({ enum: PageCount, description: 'Número de páginas' })
  @IsEnum(PageCount)
  pageCount: PageCount;

  @ApiProperty({ enum: PaperType, description: 'Tipo de hoja' })
  @IsEnum(PaperType)
  paperType: PaperType;
}

export class NotepadVariantDetailsDto {
  @ApiProperty({ enum: PageCount, description: 'Número de páginas' })
  @IsEnum(PageCount)
  pageCount: PageCount;

  @ApiProperty({ enum: PaperType, description: 'Tipo de hoja' })
  @IsEnum(PaperType)
  paperType: PaperType;
}

export class PosterVariantDetailsDto {
  @ApiProperty({ enum: PosterSize, description: 'Tamaño del poster' })
  @IsEnum(PosterSize)
  size: PosterSize;
}

// ==========================================
// DTO DE VARIANTE PRINCIPAL
// ==========================================

export class CreateProductVariantDto {
  @ApiProperty({ description: 'Precio base en moneda o centavos' })
  @IsInt()
  @Min(0)
  price: number;

  @ApiPropertyOptional({ description: 'Precio con descuento' })
  @IsOptional()
  @IsInt()
  @Min(0)
  discountPrice?: number;

  @ApiPropertyOptional({ description: 'Stock inicial', default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  stock?: number;

  @ApiPropertyOptional({ type: NotebookVariantDetailsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => NotebookVariantDetailsDto)
  notebookVariantDetails?: NotebookVariantDetailsDto;

  @ApiPropertyOptional({ type: NotepadVariantDetailsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => NotepadVariantDetailsDto)
  notepadVariantDetails?: NotepadVariantDetailsDto;

  @ApiPropertyOptional({ type: PosterVariantDetailsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => PosterVariantDetailsDto)
  posterVariantDetails?: PosterVariantDetailsDto;
}

// ==========================================
// DTO DEL PRODUCTO PADRE
// ==========================================

export class CreateProductDto {
  @ApiProperty({ description: 'Nombre del producto padre' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({ description: 'Descripción detallada' })
  @IsNotEmpty()
  @IsString()
  description: string;

  @ApiProperty({
    enum: ProductType,
    description: 'Tipo principal del producto',
  })
  @IsEnum(ProductType)
  type: ProductType;

  @ApiPropertyOptional({ description: 'Destacar en portada', default: false })
  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;

  @ApiPropertyOptional({
    description: 'URLs de las imágenes subidas a asignar al producto',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  imageUrls?: string[];

  @ApiPropertyOptional({ description: 'IDs de las etiquetas', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tagIds?: string[];

  @ApiPropertyOptional({ type: NotebookDetailsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => NotebookDetailsDto)
  notebookDetails?: NotebookDetailsDto;

  @ApiPropertyOptional({ type: NotepadDetailsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => NotepadDetailsDto)
  notepadDetails?: NotepadDetailsDto;

  @ApiPropertyOptional({ type: PosterDetailsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => PosterDetailsDto)
  posterDetails?: PosterDetailsDto;
}
