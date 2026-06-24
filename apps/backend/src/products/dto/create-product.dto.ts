import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ProductType, PageCount, PaperType, PosterSize } from '@prisma/client';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsArray,
  ValidateNested,
  Min,
  IsNumber,
} from 'class-validator';
import { Type } from 'class-transformer';

export class NotebookDetailsDto {
  @ApiProperty({ description: 'Largo en cm' })
  @IsNumber()
  length: number;

  @ApiProperty({ description: 'Ancho en cm' })
  @IsNumber()
  width: number;

  @ApiProperty({ description: 'Alto en cm' })
  @IsNumber()
  height: number;

  @ApiProperty({ enum: PageCount, description: 'Número de páginas' })
  @IsEnum(PageCount)
  pageCount: PageCount;

  @ApiProperty({ enum: PaperType, description: 'Tipo de hoja' })
  @IsEnum(PaperType)
  paperType: PaperType;
}

export class NotepadDetailsDto {
  @ApiProperty({ description: 'Largo en cm' })
  @IsNumber()
  length: number;

  @ApiProperty({ description: 'Ancho en cm' })
  @IsNumber()
  width: number;

  @ApiProperty({ description: 'Alto en cm' })
  @IsNumber()
  height: number;

  @ApiProperty({ enum: PageCount, description: 'Número de páginas' })
  @IsEnum(PageCount)
  pageCount: PageCount;

  @ApiProperty({ enum: PaperType, description: 'Tipo de hoja' })
  @IsEnum(PaperType)
  paperType: PaperType;
}

export class PosterDetailsDto {
  @ApiProperty({ enum: PosterSize, description: 'Tamaño del poster' })
  @IsEnum(PosterSize)
  size: PosterSize;

  @ApiProperty({ description: 'Ancho en cm' })
  @IsNumber()
  width: number;

  @ApiProperty({ description: 'Alto en cm' })
  @IsNumber()
  height: number;
}

export class CreateProductDto {
  @ApiProperty({ description: 'Nombre del producto' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({ description: 'Slug único (Ej: mi-producto-genial)' })
  @IsNotEmpty()
  @IsString()
  slug: string;

  @ApiProperty({ description: 'Descripción detallada' })
  @IsNotEmpty()
  @IsString()
  description: string;

  @ApiProperty({ description: 'Precio base en centavos o moneda base' })
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

  @ApiProperty({
    enum: ProductType,
    description: 'Tipo principal del producto',
  })
  @IsEnum(ProductType)
  type: ProductType;

  @ApiPropertyOptional({ description: 'Destacar en portada', default: false })
  @IsOptional()
  isFeatured?: boolean;

  @ApiPropertyOptional({
    description: 'IDs de las imágenes subidas a asignar al producto',
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
