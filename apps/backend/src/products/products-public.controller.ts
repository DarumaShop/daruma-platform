import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ProductsService } from './products.service';
import { GetProductsFilterDto } from './dto/get-products-filter.dto';

@ApiTags('Products (Public)')
@Controller('public/products')
export class ProductsPublicController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  @ApiOperation({
    summary: '(PUBLIC) Obtiene el listado de productos activos.',
  })
  @ApiResponse({ status: 200, description: 'Catálogo de productos paginado' })
  findAll(@Query() filters: GetProductsFilterDto) {
    return this.productsService.findAllPublic(filters);
  }

  @Get(':slug')
  @ApiOperation({
    summary: '(PUBLIC) Obtiene el detalle de un producto por su slug.',
  })
  @ApiResponse({ status: 200, description: 'Detalle del producto' })
  findOne(@Param('slug') slug: string) {
    return this.productsService.findOne(slug);
  }
}
