import { Test, TestingModule } from '@nestjs/testing';
import { ToggleVariantService } from '../../../../src/products/services/toggle-variant.service';
import { PrismaService } from '../../../../src/prisma/prisma.service';
import { ProductUtilsService } from '../../../../src/products/services/product-utils.service';
import { NotFoundException } from '@nestjs/common';

describe('ToggleVariantService', () => {
  let service: ToggleVariantService;
  let prismaService: PrismaService;
  let productUtils: ProductUtilsService;

  const mockPrismaService = {
    productVariant: {
      findUnique: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    product: {
      update: jest.fn(),
    },
  };

  const mockProductUtils = {
    recalculateProductPrices: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ToggleVariantService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: ProductUtilsService, useValue: mockProductUtils },
      ],
    }).compile();

    service = module.get<ToggleVariantService>(ToggleVariantService);
    prismaService = module.get<PrismaService>(PrismaService);
    productUtils = module.get<ProductUtilsService>(ProductUtilsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const sku = 'SKU-1';
  const variant = { productId: 'prod-1', sku };

  describe('activateVariant', () => {
    it('Debería activar la variante y recalcular precios', async () => {
      mockPrismaService.productVariant.findUnique.mockResolvedValue(variant);
      mockPrismaService.productVariant.update.mockResolvedValue({
        sku,
        isActive: true,
      });

      const result = await service.activateVariant(sku);

      expect(result).toEqual({
        message: 'Variante activada correctamente',
        variant: { sku, isActive: true },
      });
      expect(prismaService.productVariant.update).toHaveBeenCalledWith({
        where: { sku },
        data: { isActive: true },
        omit: { id: true, productId: true },
      });
      expect(productUtils.recalculateProductPrices).toHaveBeenCalledWith(
        'prod-1',
      );
    });

    it('Debería lanzar NotFoundException si la variante no existe', async () => {
      mockPrismaService.productVariant.findUnique.mockResolvedValue(null);

      await expect(service.activateVariant('no-existe')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('deactivateVariant', () => {
    it('Debería desactivar variante, recalcular precios y NO desactivar producto si quedan activas', async () => {
      mockPrismaService.productVariant.findUnique.mockResolvedValue(variant);
      mockPrismaService.productVariant.update.mockResolvedValue({
        sku,
        isActive: false,
      });
      mockPrismaService.productVariant.count.mockResolvedValue(1);

      const result = await service.deactivateVariant(sku);

      expect(result.message).toBe('Variante desactivada correctamente');
      expect(prismaService.productVariant.update).toHaveBeenCalledWith({
        where: { sku },
        data: { isActive: false },
        omit: { id: true, productId: true },
      });
      expect(productUtils.recalculateProductPrices).toHaveBeenCalledWith(
        'prod-1',
      );
      expect(prismaService.product.update).not.toHaveBeenCalled();
    });

    it('Debería desactivar variante, recalcular precios y DESACTIVAR producto si NO quedan activas', async () => {
      mockPrismaService.productVariant.findUnique.mockResolvedValue(variant);
      mockPrismaService.productVariant.update.mockResolvedValue({
        sku,
        isActive: false,
      });
      mockPrismaService.productVariant.count.mockResolvedValue(0);

      await service.deactivateVariant(sku);

      expect(prismaService.product.update).toHaveBeenCalledWith({
        where: { id: 'prod-1' },
        data: { isActive: false },
      });
    });
  });

  describe('updateStock', () => {
    it('Debería actualizar el stock', async () => {
      mockPrismaService.productVariant.findUnique.mockResolvedValue(variant);
      mockPrismaService.productVariant.update.mockResolvedValue({
        sku,
        stock: 50,
      });

      const result = await service.updateStock(sku, 50);

      expect(result).toEqual({ sku, stock: 50 });
      expect(prismaService.productVariant.update).toHaveBeenCalledWith({
        where: { sku },
        data: { stock: 50 },
        omit: { id: true, productId: true },
      });
    });

    it('Debería lanzar NotFoundException si no existe', async () => {
      mockPrismaService.productVariant.findUnique.mockResolvedValue(null);

      await expect(service.updateStock('no-existe', 10)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
