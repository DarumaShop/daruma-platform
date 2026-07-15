import { Test, TestingModule } from '@nestjs/testing';
import { ProductUtilsService } from '../../../../src/products/services/product-utils.service';
import { PrismaService } from '../../../../src/prisma/prisma.service';
import { DeleteImageService } from '../../../../src/uploads/services/delete-image.service';
import { BadRequestException } from '@nestjs/common';

describe('ProductUtilsService', () => {
  let service: ProductUtilsService;
  let prismaService: PrismaService;
  let deleteImageService: DeleteImageService;

  const mockPrismaService = {
    tag: {
      findMany: jest.fn(),
    },
    product: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    productVariant: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    pendingUpload: {
      deleteMany: jest.fn(),
    },
  };

  const mockDeleteImageService = {
    deleteImageFromSupabase: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductUtilsService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: DeleteImageService, useValue: mockDeleteImageService },
      ],
    }).compile();

    service = module.get<ProductUtilsService>(ProductUtilsService);
    prismaService = module.get<PrismaService>(PrismaService);
    deleteImageService = module.get<DeleteImageService>(DeleteImageService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('resolveTagAncestors', () => {
    it('Debería resolver todos los ancestros de un conjunto de tags', async () => {
      mockPrismaService.tag.findMany.mockResolvedValue([
        { id: 'hijo', parentId: 'padre' },
        { id: 'padre', parentId: 'abuelo' },
        { id: 'abuelo', parentId: null },
      ]);

      const result = await service.resolveTagAncestors(['hijo']);

      expect(result).toEqual(
        expect.arrayContaining(['hijo', 'padre', 'abuelo']),
      );
      expect(result.length).toBe(3);
    });

    it('Debería lanzar BadRequestException si el tag proveído no existe en DB', async () => {
      mockPrismaService.tag.findMany.mockResolvedValue([
        { id: '1', parentId: null },
      ]);

      await expect(service.resolveTagAncestors(['no-existe'])).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('generateSlug', () => {
    it('Debería generar un slug limpio', async () => {
      mockPrismaService.product.findUnique.mockResolvedValue(null);
      const slug = await service.generateSlug('Mi Producto!');
      expect(slug).toBe('mi-producto');
    });

    it('Debería añadir un sufijo numérico si el slug existe', async () => {
      mockPrismaService.product.findUnique
        .mockResolvedValueOnce({ id: '1' })
        .mockResolvedValueOnce(null);

      const slug = await service.generateSlug('Mi Producto!');
      expect(slug).toBe('mi-producto-2');
    });
  });

  describe('generateSku', () => {
    it('Debería generar un SKU correcto para NOTEBOOK', async () => {
      mockPrismaService.productVariant.findUnique.mockResolvedValue(null);

      const sku = await service.generateSku('NOTEBOOK', 'Agenda Daruma', {
        pageCount: 'PAGES_100',
        paperType: 'DOTTED',
      });

      expect(sku).toBe('NOTE-AD-100-DOTTED');
    });

    it('Debería añadir hash aleatorio en caso de colisión de SKU', async () => {
      mockPrismaService.productVariant.findUnique
        .mockResolvedValueOnce({ id: '1' })
        .mockResolvedValueOnce(null);

      const sku = await service.generateSku('SIMPLE', 'Cinta', null);
      expect(sku).toMatch(/^PRD-C-[A-Z0-9]{4}$/);
    });
  });

  describe('recalculateProductPrices', () => {
    it('Debería actualizar basePrice y maxPrice correctamente basado en las variantes', async () => {
      mockPrismaService.productVariant.findMany.mockResolvedValue([
        { price: 100, discountPrice: 80 },
        { price: 120, discountPrice: null },
        { price: 90, discountPrice: 0 },
      ]);
      mockPrismaService.product.update.mockResolvedValue({});

      await service.recalculateProductPrices('p1');

      expect(prismaService.product.update).toHaveBeenCalledWith({
        where: { id: 'p1' },
        data: { basePrice: 80, maxPrice: 120 },
      });
    });

    it('Debería colocar 0 si no hay variantes activas', async () => {
      mockPrismaService.productVariant.findMany.mockResolvedValue([]);
      mockPrismaService.product.update.mockResolvedValue({});

      await service.recalculateProductPrices('p1');

      expect(prismaService.product.update).toHaveBeenCalledWith({
        where: { id: 'p1' },
        data: { basePrice: 0, maxPrice: 0 },
      });
    });
  });

  describe('revertImages', () => {
    it('Debería llamar a deleteImageService y Prisma para cada url', async () => {
      mockDeleteImageService.deleteImageFromSupabase.mockResolvedValue(
        undefined,
      );
      mockPrismaService.pendingUpload.deleteMany.mockResolvedValue(undefined);

      await service.revertImages(['url1', 'url2']);

      expect(deleteImageService.deleteImageFromSupabase).toHaveBeenCalledTimes(
        2,
      );
      expect(prismaService.pendingUpload.deleteMany).toHaveBeenCalledTimes(2);
    });
  });
});
