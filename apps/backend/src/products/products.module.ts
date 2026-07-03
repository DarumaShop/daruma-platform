import { Module } from '@nestjs/common';
import { ProductsService } from './products.service';
import { ProductsPublicController } from './products-public.controller';
import { ProductsAdminController } from './products-admin.controller';
import { UploadsModule } from '../uploads/uploads.module';

@Module({
  imports: [UploadsModule],
  providers: [ProductsService],
  controllers: [ProductsPublicController, ProductsAdminController],
})
export class ProductsModule {}
