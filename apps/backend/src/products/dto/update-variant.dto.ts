import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateProductVariantDto } from './create-product.dto';

export class UpdateVariantDto extends PartialType(
  OmitType(CreateProductVariantDto, ['sku'] as const),
) {}
