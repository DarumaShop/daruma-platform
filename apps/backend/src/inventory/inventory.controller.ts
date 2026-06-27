import { Controller, Patch, Param, Body, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { InventoryService } from './inventory.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { UpdateStockDto } from './dto/update-stock.dto';

@ApiTags('Inventory')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('admin/inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Patch('variants/:variantId/stock')
  @ApiOperation({
    summary: '(ADMIN) Actualiza el stock de una variante específica',
  })
  @ApiResponse({ status: 200, description: 'Stock actualizado exitosamente' })
  updateStock(
    @Param('variantId') variantId: string,
    @Body() updateStockDto: UpdateStockDto,
  ) {
    return this.inventoryService.updateStock(variantId, updateStockDto.stock);
  }
}
