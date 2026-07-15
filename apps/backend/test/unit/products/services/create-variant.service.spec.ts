import { Test, TestingModule } from '@nestjs/testing';
import { CreateVariantService } from '../../../../src/products/services/create-variant.service';
import { PrismaService } from '../../../../src/prisma/prisma.service';
import { ProductUtilsService } from '../../../../src/products/services/product-utils.service';
import { NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

describe('CreateVariantService', () => {
  let service: CreateVariantService;
  let prismaService: PrismaService;
  let productUtils: ProductUtilsService;

  const mockPrismaService = {
    product: {
      findUnique: jest.fn(),
    },
    productVariant: {
      create: jest.fn(),
    },
  };

  const mockProductUtils = {
    extractVariantDetails: jest.fn(),
    generateSku: jest.fn(),
    recalculateProductPrices: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateVariantService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: ProductUtilsService, useValue: mockProductUtils },
      ],
    }).compile();

    service = module.get<CreateVariantService>(CreateVariantService);
    prismaService = module.get<PrismaService>(PrismaService);
    productUtils = module.get<ProductUtilsService>(ProductUtilsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('addVariant', () => {
    const slug = 'mi-producto';
    const product = { id: 'prod-1', type: 'NOTEBOOK', name: 'Mi Producto' };
    const validDto = {
      price: 100,
      stock: 10,
      notebookVariantDetails: { pageCount: 'PAGES_100' },
    } as any;

    it('Debería añadir una variante exitosamente', async () => {
      mockPrismaService.product.findUnique.mockResolvedValue(product);
      mockProductUtils.extractVariantDetails.mockReturnValue(validDto.notebookVariantDetails);
      mockProductUtils.generateSku.mockResolvedValue('SKU-1');
      
      const createdVariant = { sku: 'SKU-1', price: 100 };
      mockPrismaService.productVariant.create.mockResolvedValue(createdVariant);

      const result = await service.addVariant(slug, validDto);

      expect(result).toEqual(createdVariant);
      expect(productUtils.generateSku).toHaveBeenCalledWith('NOTEBOOK', 'Mi Producto', validDto.notebookVariantDetails);
      expect(prismaService.productVariant.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ sku: 'SKU-1', productId: 'prod-1' }),
        omit: { id: true, productId: true },
      });
      expect(productUtils.recalculateProductPrices).toHaveBeenCalledWith('prod-1');
    });

    it('Debería lanzar NotFoundException si el producto no existe', async () => {
      mockPrismaService.product.findUnique.mockResolvedValue(null);

      await expect(service.addVariant('no-existe', validDto)).rejects.toThrow(NotFoundException);
    });

    it('Debería lanzar BadRequestException si faltan detalles específicos del tipo', async () => {
      mockPrismaService.product.findUnique.mockResolvedValue(product);
      mockProductUtils.extractVariantDetails.mockReturnValue(undefined);

      await expect(service.addVariant(slug, validDto)).rejects.toThrow(BadRequestException);
    });

    it('Debería lanzar ConflictException si Prisma lanza error P2002', async () => {
      mockPrismaService.product.findUnique.mockResolvedValue(product);
      mockProductUtils.extractVariantDetails.mockReturnValue(validDto.notebookVariantDetails);
      mockProductUtils.generateSku.mockResolvedValue('SKU-1');
      
      mockPrismaService.productVariant.create.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('', { code: 'P2002', clientVersion: '1' })
      );

      await expect(service.addVariant(slug, validDto)).rejects.toThrow(ConflictException);
    });
  });
});
