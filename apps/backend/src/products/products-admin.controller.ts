import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Delete,
  UseGuards,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ProductsService } from './products.service';
import {
  CreateProductDto,
  CreateProductVariantDto,
} from './dto/create-product.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { GetProductsFilterDto } from './dto/get-products-filter.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { UpdateVariantDto } from './dto/update-variant.dto';
import { UpdateStockDto } from './dto/update-stock.dto';

@ApiTags('Products (Admin)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('admin/products')
export class ProductsAdminController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  @ApiOperation({
    summary: '(ADMIN) Crea el registro base de un producto.',
  })
  @ApiResponse({ status: 201, description: 'Producto creado' })
  create(@Body() createProductDto: CreateProductDto) {
    return this.productsService.create(createProductDto);
  }

  @Get()
  @ApiOperation({
    summary: '(ADMIN) Obtiene el listado completo de productos.',
  })
  @ApiResponse({ status: 200, description: 'Catálogo administrativo paginado' })
  findAllAdmin(@Query() filters: GetProductsFilterDto) {
    return this.productsService.findAllAdmin(filters);
  }

  @Get(':slug')
  @ApiOperation({
    summary: '(ADMIN) Obtiene el detalle de un producto por su slug.',
  })
  @ApiResponse({ status: 200, description: 'Detalle del producto' })
  findOneAdmin(@Param('slug') slug: string) {
    return this.productsService.findOneAdmin(slug);
  }

  @Patch(':slug')
  @ApiOperation({
    summary: '(ADMIN) Actualiza la información base de un producto.',
  })
  @ApiResponse({ status: 200, description: 'Producto actualizado' })
  updateBaseProduct(
    @Param('slug') slug: string,
    @Body() updateProductDto: UpdateProductDto,
  ) {
    return this.productsService.updateBaseProduct(slug, updateProductDto);
  }

  @Delete(':slug')
  @ApiOperation({
    summary: '(ADMIN) Elimina permanentemente un producto de la base de datos.',
  })
  @ApiResponse({
    status: 200,
    description: 'Producto eliminado permanentemente',
  })
  remove(@Param('slug') slug: string) {
    return this.productsService.remove(slug);
  }

  @Patch(':slug/deactivate')
  @ApiOperation({
    summary: '(ADMIN) Marca un producto como inactivo.',
  })
  @ApiResponse({ status: 200, description: 'Producto desactivado' })
  deactivate(@Param('slug') slug: string) {
    return this.productsService.deactivate(slug);
  }

  @Patch(':slug/activate')
  @ApiOperation({
    summary: '(ADMIN) Marca un producto como activo.',
  })
  @ApiResponse({ status: 200, description: 'Producto activado' })
  activate(@Param('slug') slug: string) {
    return this.productsService.activate(slug);
  }

  @Post(':slug/variants')
  @ApiOperation({
    summary: '(ADMIN) Añade una nueva variante a un producto existente.',
  })
  @ApiResponse({ status: 201, description: 'Variante creada' })
  addVariant(
    @Param('slug') slug: string,
    @Body() createVariantDto: CreateProductVariantDto,
  ) {
    return this.productsService.addVariant(slug, createVariantDto);
  }

  @Patch('variants/:sku')
  @ApiOperation({
    summary: '(ADMIN) Actualiza los detalles de una variante específica.',
  })
  @ApiResponse({ status: 200, description: 'Variante actualizada' })
  updateVariant(
    @Param('sku') sku: string,
    @Body() updateVariantDto: UpdateVariantDto,
  ) {
    return this.productsService.updateVariant(sku, updateVariantDto);
  }

  @Patch('variants/:sku/activate')
  @ApiOperation({
    summary: '(ADMIN) Marca una variante como activa.',
  })
  @ApiResponse({ status: 200, description: 'Variante activada' })
  activateVariant(@Param('sku') sku: string) {
    return this.productsService.activateVariant(sku);
  }

  @Patch('variants/:sku/deactivate')
  @ApiOperation({
    summary: '(ADMIN) Marca una variante como inactiva.',
  })
  @ApiResponse({ status: 200, description: 'Variante desactivada' })
  deactivateVariant(@Param('sku') sku: string) {
    return this.productsService.deactivateVariant(sku);
  }

  @Patch('variants/:sku/stock')
  @ApiOperation({
    summary: '(ADMIN) Actualiza el stock de una variante específica.',
  })
  @ApiResponse({ status: 200, description: 'Stock actualizado exitosamente' })
  updateStock(
    @Param('sku') sku: string,
    @Body() updateStockDto: UpdateStockDto,
  ) {
    return this.productsService.updateStock(sku, updateStockDto.stock);
  }

  @Delete('variants/:sku')
  @ApiOperation({
    summary:
      '(ADMIN) Elimina definitivamente una variante de la base de datos.',
  })
  @ApiResponse({ status: 200, description: 'Variante eliminada' })
  removeVariant(@Param('sku') sku: string) {
    return this.productsService.removeVariant(sku);
  }
}
