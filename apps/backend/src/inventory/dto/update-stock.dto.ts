import { IsInt, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateStockDto {
  @ApiProperty({ description: 'Nuevo valor de stock para la variante' })
  @IsInt()
  @Min(0)
  stock: number;
}
