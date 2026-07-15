import { Test, TestingModule } from '@nestjs/testing';
import { UpdateVariantService } from '../../../../src/products/services/update-variant.service';
import { PrismaService } from '../../../../src/prisma/prisma.service';
import { ProductUtilsService } from '../../../../src/products/services/product-utils.service';
import { NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

describe('UpdateVariantService', () => {
  let service: UpdateVariantService;
  let prismaService: PrismaService;
  let productUtils: ProductUtilsService;

  const mockPrismaService = {
    productVariant: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockProductUtils = {
    extractVariantDetails: jest.fn(),
    recalculateProductPrices: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UpdateVariantService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: ProductUtilsService, useValue: mockProductUtils },
      ],
    }).compile();

    service = module.get<UpdateVariantService>(UpdateVariantService);
    prismaService = module.get<PrismaService>(PrismaService);
    productUtils = module.get<ProductUtilsService>(ProductUtilsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('updateVariant', () => {
    const sku = 'SKU-1';
    const existingVariant = {
      productId: 'prod-1',
      sku,
      product: { type: 'NOTEBOOK' },
    };

    it('Debería actualizar una variante y recalcular precios', async () => {
      mockPrismaService.productVariant.findUnique.mockResolvedValue(
        existingVariant,
      );
      mockProductUtils.extractVariantDetails.mockReturnValue({
        coverType: 'SOFT',
      });

      const updatedVariant = { sku, price: 150 };
      mockPrismaService.productVariant.update.mockResolvedValue(updatedVariant);

      const dto = {
        price: 150,
        notebookVariantDetails: { coverType: 'SOFT' },
      } as any;
      const result = await service.updateVariant(sku, dto);

      expect(result).toEqual(updatedVariant);
      expect(prismaService.productVariant.findUnique).toHaveBeenCalledWith({
        where: { sku },
        include: { product: true },
      });
      expect(prismaService.productVariant.update).toHaveBeenCalledWith({
        where: { sku },
        data: {
          price: 150,
          attributes: { coverType: 'SOFT' },
        },
        omit: { id: true, productId: true },
      });
      expect(productUtils.recalculateProductPrices).toHaveBeenCalledWith(
        'prod-1',
      );
    });

    it('Debería lanzar NotFoundException si la variante no existe', async () => {
      mockPrismaService.productVariant.findUnique.mockResolvedValue(null);

      await expect(
        service.updateVariant('no-existe', {} as any),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
