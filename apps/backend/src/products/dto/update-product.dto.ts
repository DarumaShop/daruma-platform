import { ApiPropertyOptional, PartialType, OmitType } from '@nestjs/swagger';
import { CreateProductDto } from './create-product.dto';
import { IsOptional, IsString } from 'class-validator';

export class UpdateProductDto extends PartialType(
  OmitType(CreateProductDto, ['variants'] as const),
) {
  @ApiPropertyOptional({
    description:
      'Actualizar las etiquetas del producto. Enviar arreglo vacío [] para borrar todas las etiquetas.',
    type: [String],
  })
  @IsOptional()
  @IsString({ each: true })
  tagIds?: string[];
}
