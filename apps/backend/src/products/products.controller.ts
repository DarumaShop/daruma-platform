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
  BadRequestException,
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

@ApiTags('Products')
@Controller()
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get('public/products')
  @ApiOperation({ summary: '(PUBLIC) Obtiene el listado de productos activos' })
  @ApiResponse({ status: 200, description: 'Catálogo de productos paginado' })
  findAll(@Query() filters: GetProductsFilterDto) {
    return this.productsService.findAllPublic(filters);
  }

  @Get('public/products/:slug')
  @ApiOperation({
    summary: '(PUBLIC) Obtiene el detalle de un producto por su slug',
  })
  @ApiResponse({ status: 200, description: 'Detalle del producto' })
  findOne(@Param('slug') slug: string) {
    return this.productsService.findOne(slug);
  }

  @Get('admin/products/suggest-sku')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary:
      '(ADMIN) Sugiere un SKU automático basado en el tipo y nombre del producto',
  })
  @ApiResponse({ status: 200, description: 'SKU sugerido' })
  suggestSku(
    @Query('type') type: import('@prisma/client').ProductType,
    @Query('name') name: string,
  ) {
    if (!type || !name) {
      throw new BadRequestException('type y name son obligatorios');
    }
    return this.productsService.suggestSku(type, name);
  }

  @Post('admin/products')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary:
      '(ADMIN) Crea un producto, sus variantes y detalles en una sola transacción',
  })
  @ApiResponse({ status: 201, description: 'Producto creado' })
  create(@Body() createProductDto: CreateProductDto) {
    return this.productsService.create(createProductDto);
  }

  @Delete('admin/products/:id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary:
      '(ADMIN) Elimina permanentemente un producto de la base de datos y sus imágenes (Hard Delete)',
  })
  @ApiResponse({
    status: 200,
    description: 'Producto eliminado permanentemente',
  })
  remove(@Param('id') id: string) {
    return this.productsService.remove(id);
  }

  @Patch('admin/products/:id/soft-delete')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: '(ADMIN) Marca un producto como inactivo (Soft Delete)',
  })
  @ApiResponse({ status: 200, description: 'Producto desactivado' })
  softDelete(@Param('id') id: string) {
    return this.productsService.softDelete(id);
  }

  @Patch('admin/products/:id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary:
      '(ADMIN) Actualiza la información base de un producto (nombre, descripción, imágenes, etiquetas)',
  })
  @ApiResponse({ status: 200, description: 'Producto actualizado' })
  updateBaseProduct(
    @Param('id') id: string,
    @Body() updateProductDto: UpdateProductDto,
  ) {
    return this.productsService.updateBaseProduct(id, updateProductDto);
  }

  @Post('admin/products/:id/variants')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: '(ADMIN) Añade una nueva variante a un producto existente',
  })
  @ApiResponse({ status: 201, description: 'Variante creada' })
  addVariant(
    @Param('id') id: string,
    @Body() createVariantDto: CreateProductVariantDto,
  ) {
    return this.productsService.addVariant(id, createVariantDto);
  }

  @Patch('admin/products/variants/:variantId')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary:
      '(ADMIN) Actualiza los detalles (precio, isActive) de una variante específica',
  })
  @ApiResponse({ status: 200, description: 'Variante actualizada' })
  updateVariant(
    @Param('variantId') variantId: string,
    @Body() updateVariantDto: UpdateVariantDto,
  ) {
    return this.productsService.updateVariant(variantId, updateVariantDto);
  }

  @Get('admin/products')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary:
      '(ADMIN) Obtiene el listado completo de productos (activos e inactivos)',
  })
  @ApiResponse({ status: 200, description: 'Catálogo administrativo paginado' })
  findAllAdmin(@Query() filters: GetProductsFilterDto) {
    return this.productsService.findAllAdmin(filters);
  }

  @Get('admin/products/:id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary:
      '(ADMIN) Obtiene el detalle de un producto por su ID (activo o inactivo)',
  })
  @ApiResponse({ status: 200, description: 'Detalle del producto' })
  findOneAdmin(@Param('id') id: string) {
    return this.productsService.findOneAdmin(id);
  }

  @Delete('admin/products/variants/:variantId')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: '(ADMIN) Elimina definitivamente una variante de la base de datos',
  })
  @ApiResponse({ status: 200, description: 'Variante eliminada' })
  removeVariant(@Param('variantId') variantId: string) {
    return this.productsService.removeVariant(variantId);
  }
}
