import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@ApiTags('Products')
@Controller()
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get('public/products')
  @ApiOperation({ summary: '(PUBLIC) Obtiene el listado de productos activos' })
  @ApiResponse({ status: 200, description: 'Catálogo de productos' })
  findAll() {
    return this.productsService.findAllPublic();
  }

  @Get('public/products/:slug')
  @ApiOperation({
    summary: '(PUBLIC) Obtiene el detalle de un producto por su slug',
  })
  @ApiResponse({ status: 200, description: 'Detalle del producto' })
  findOne(@Param('slug') slug: string) {
    return this.productsService.findOne(slug);
  }

  @Post('admin/products')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: '(ADMIN) Crea un producto y sus detalles en una sola transacción',
  })
  @ApiResponse({ status: 201, description: 'Producto creado' })
  create(@Body() createProductDto: CreateProductDto) {
    return this.productsService.create(createProductDto);
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
}
