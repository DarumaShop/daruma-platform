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
import { CreateProductService } from './services/create-product.service';
import { GetProductsService } from './services/get-products.service';
import { UpdateProductService } from './services/update-product.service';
import { DeleteProductService } from './services/delete-product.service';
import { ToggleProductService } from './services/toggle-product.service';
import { CreateVariantService } from './services/create-variant.service';
import { UpdateVariantService } from './services/update-variant.service';
import { ToggleVariantService } from './services/toggle-variant.service';
import { DeleteVariantService } from './services/delete-variant.service';
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
  constructor(
    private readonly createProductService: CreateProductService,
    private readonly getProductsService: GetProductsService,
    private readonly updateProductService: UpdateProductService,
    private readonly deleteProductService: DeleteProductService,
    private readonly toggleProductService: ToggleProductService,
    private readonly createVariantService: CreateVariantService,
    private readonly updateVariantService: UpdateVariantService,
    private readonly toggleVariantService: ToggleVariantService,
    private readonly deleteVariantService: DeleteVariantService,
  ) {}

  @Post()
  @ApiOperation({
    summary: '(ADMIN) Crea el registro base de un producto.',
  })
  @ApiResponse({ status: 201, description: 'Producto creado' })
  create(@Body() createProductDto: CreateProductDto) {
    return this.createProductService.create(createProductDto);
  }

  @Get()
  @ApiOperation({
    summary: '(ADMIN) Obtiene el listado completo de productos.',
  })
  @ApiResponse({ status: 200, description: 'Catálogo administrativo paginado' })
  findAllAdmin(@Query() filters: GetProductsFilterDto) {
    return this.getProductsService.findAllAdmin(filters);
  }

  @Get(':slug')
  @ApiOperation({
    summary: '(ADMIN) Obtiene el detalle de un producto por su slug.',
  })
  @ApiResponse({ status: 200, description: 'Detalle del producto' })
  findOneAdmin(@Param('slug') slug: string) {
    return this.getProductsService.findOneAdmin(slug);
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
    return this.updateProductService.updateBaseProduct(slug, updateProductDto);
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
    return this.deleteProductService.remove(slug);
  }

  @Patch(':slug/deactivate')
  @ApiOperation({
    summary: '(ADMIN) Marca un producto como inactivo.',
  })
  @ApiResponse({ status: 200, description: 'Producto desactivado' })
  deactivate(@Param('slug') slug: string) {
    return this.toggleProductService.deactivate(slug);
  }

  @Patch(':slug/activate')
  @ApiOperation({
    summary: '(ADMIN) Marca un producto como activo.',
  })
  @ApiResponse({ status: 200, description: 'Producto activado' })
  activate(@Param('slug') slug: string) {
    return this.toggleProductService.activate(slug);
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
    return this.createVariantService.addVariant(slug, createVariantDto);
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
    return this.updateVariantService.updateVariant(sku, updateVariantDto);
  }

  @Patch('variants/:sku/activate')
  @ApiOperation({
    summary: '(ADMIN) Marca una variante como activa.',
  })
  @ApiResponse({ status: 200, description: 'Variante activada' })
  activateVariant(@Param('sku') sku: string) {
    return this.toggleVariantService.activateVariant(sku);
  }

  @Patch('variants/:sku/deactivate')
  @ApiOperation({
    summary: '(ADMIN) Marca una variante como inactiva.',
  })
  @ApiResponse({ status: 200, description: 'Variante desactivada' })
  deactivateVariant(@Param('sku') sku: string) {
    return this.toggleVariantService.deactivateVariant(sku);
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
    return this.toggleVariantService.updateStock(sku, updateStockDto.stock);
  }

  @Delete('variants/:sku')
  @ApiOperation({
    summary:
      '(ADMIN) Elimina definitivamente una variante de la base de datos.',
  })
  @ApiResponse({ status: 200, description: 'Variante eliminada' })
  removeVariant(@Param('sku') sku: string) {
    return this.deleteVariantService.removeVariant(sku);
  }
}
