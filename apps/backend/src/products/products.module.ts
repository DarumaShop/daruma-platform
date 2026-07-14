import { Module } from '@nestjs/common';
import { ProductUtilsService } from './services/product-utils.service';
import { CreateProductService } from './services/create-product.service';
import { GetProductsService } from './services/get-products.service';
import { UpdateProductService } from './services/update-product.service';
import { DeleteProductService } from './services/delete-product.service';
import { ToggleProductService } from './services/toggle-product.service';
import { CreateVariantService } from './services/create-variant.service';
import { UpdateVariantService } from './services/update-variant.service';
import { ToggleVariantService } from './services/toggle-variant.service';
import { DeleteVariantService } from './services/delete-variant.service';
import { ProductsPublicController } from './products-public.controller';
import { ProductsAdminController } from './products-admin.controller';
import { UploadsModule } from '../uploads/uploads.module';

@Module({
  imports: [UploadsModule],
  providers: [
    ProductUtilsService,
    CreateProductService,
    GetProductsService,
    UpdateProductService,
    DeleteProductService,
    ToggleProductService,
    CreateVariantService,
    UpdateVariantService,
    ToggleVariantService,
    DeleteVariantService,
  ],
  controllers: [ProductsPublicController, ProductsAdminController],
})
export class ProductsModule {}
