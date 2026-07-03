import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { CreateProductDto } from './create-product.dto';
import { IsOptional, IsString } from 'class-validator';

export class UpdateProductDto extends PartialType(CreateProductDto) {
  @ApiPropertyOptional({
    description:
      'Actualizar las etiquetas del producto. Enviar arreglo vacío [] para borrar todas las etiquetas.',
    type: [String],
  })
  @IsOptional()
  @IsString({ each: true })
  tagIds?: string[];
}
