import { Test, TestingModule } from '@nestjs/testing';
import { DeleteVariantService } from '../../../../src/products/services/delete-variant.service';
import { PrismaService } from '../../../../src/prisma/prisma.service';
import { ProductUtilsService } from '../../../../src/products/services/product-utils.service';
import { NotFoundException } from '@nestjs/common';

describe('DeleteVariantService', () => {
  let service: DeleteVariantService;
  let prismaService: PrismaService;
  let productUtils: ProductUtilsService;

  const mockPrismaService = {
    productVariant: {
      findUnique: jest.fn(),
      delete: jest.fn(),
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
        DeleteVariantService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: ProductUtilsService, useValue: mockProductUtils },
      ],
    }).compile();

    service = module.get<DeleteVariantService>(DeleteVariantService);
    prismaService = module.get<PrismaService>(PrismaService);
    productUtils = module.get<ProductUtilsService>(ProductUtilsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('removeVariant', () => {
    const sku = 'SKU-1';
    const variant = { productId: 'prod-1', sku };

    it('Debería eliminar la variante, recalcular precios y NO desactivar producto si quedan variantes', async () => {
      mockPrismaService.productVariant.findUnique.mockResolvedValue(variant);
      mockPrismaService.productVariant.delete.mockResolvedValue({ sku });
      mockPrismaService.productVariant.count.mockResolvedValue(1);

      const result = await service.removeVariant(sku);

      expect(result).toEqual({
        message: 'Variante eliminada permanentemente',
        variant: { sku },
      });
      expect(prismaService.productVariant.delete).toHaveBeenCalledWith({
        where: { sku },
        omit: { id: true, productId: true },
      });
      expect(productUtils.recalculateProductPrices).toHaveBeenCalledWith('prod-1');
      expect(prismaService.productVariant.count).toHaveBeenCalledWith({
        where: { productId: 'prod-1' },
      });
      expect(prismaService.product.update).not.toHaveBeenCalled();
    });

    it('Debería eliminar variante, recalcular precios y DESACTIVAR producto si NO quedan variantes', async () => {
      mockPrismaService.productVariant.findUnique.mockResolvedValue(variant);
      mockPrismaService.productVariant.delete.mockResolvedValue({ sku });
      mockPrismaService.productVariant.count.mockResolvedValue(0);

      await service.removeVariant(sku);

      expect(prismaService.product.update).toHaveBeenCalledWith({
        where: { id: 'prod-1' },
        data: { isActive: false },
      });
    });

    it('Debería lanzar NotFoundException si la variante no existe', async () => {
      mockPrismaService.productVariant.findUnique.mockResolvedValue(null);

      await expect(service.removeVariant('no-existe')).rejects.toThrow(
        NotFoundException,
      );
      expect(prismaService.productVariant.delete).not.toHaveBeenCalled();
    });
  });
});
