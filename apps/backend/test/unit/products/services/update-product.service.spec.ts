import { Test, TestingModule } from '@nestjs/testing';
import { UpdateProductService } from '../../../../src/products/services/update-product.service';
import { PrismaService } from '../../../../src/prisma/prisma.service';
import { ProductUtilsService } from '../../../../src/products/services/product-utils.service';
import { DeleteImageService } from '../../../../src/uploads/services/delete-image.service';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

describe('UpdateProductService', () => {
  let service: UpdateProductService;
  let prismaService: PrismaService;
  let productUtils: ProductUtilsService;
  let deleteImageService: DeleteImageService;

  const mockPrismaService = {
    product: {
      findUnique: jest.fn(),
    },
    productImage: {
      findMany: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const mockProductUtils = {
    extractProductDetails: jest.fn(),
    resolveTagAncestors: jest.fn(),
  };

  const mockDeleteImageService = {
    deleteImageFromSupabase: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UpdateProductService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: ProductUtilsService, useValue: mockProductUtils },
        { provide: DeleteImageService, useValue: mockDeleteImageService },
      ],
    }).compile();

    service = module.get<UpdateProductService>(UpdateProductService);
    prismaService = module.get<PrismaService>(PrismaService);
    productUtils = module.get<ProductUtilsService>(ProductUtilsService);
    deleteImageService = module.get<DeleteImageService>(DeleteImageService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('updateBaseProduct', () => {
    const productSlug = 'mi-producto';
    const product = { id: 'prod-1', slug: productSlug };

    it('Debería actualizar un producto y limpiar imágenes huérfanas', async () => {
      mockPrismaService.product.findUnique.mockResolvedValue(product);
      mockProductUtils.extractProductDetails.mockReturnValue(undefined);
      mockProductUtils.resolveTagAncestors.mockResolvedValue(['tag1']);

      const oldImages = [{ url: 'http://img1' }, { url: 'http://img2' }];
      mockPrismaService.productImage.findMany.mockResolvedValue(oldImages);

      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        return { name: 'New Name' }; // Dummy result
      });

      const dto = {
        name: 'New Name',
        tagIds: ['tag1'],
        imageUrls: ['http://img2', 'http://img3'],
      } as any;

      const result = await service.updateBaseProduct(productSlug, dto);

      expect(result).toEqual({ name: 'New Name' });
      expect(prismaService.product.findUnique).toHaveBeenCalledWith({
        where: { slug: productSlug },
      });
      expect(prismaService.productImage.findMany).toHaveBeenCalledWith({
        where: { productId: product.id },
        select: { url: true },
      });
      expect(deleteImageService.deleteImageFromSupabase).toHaveBeenCalledWith(
        'http://img1',
      );
      expect(
        deleteImageService.deleteImageFromSupabase,
      ).not.toHaveBeenCalledWith('http://img2');
    });

    it('Debería lanzar NotFoundException si el producto no existe', async () => {
      mockPrismaService.product.findUnique.mockResolvedValue(null);

      await expect(
        service.updateBaseProduct('no-existe', {} as any),
      ).rejects.toThrow(NotFoundException);
    });

    it('Debería lanzar ConflictException si prisma arroja P2002', async () => {
      mockPrismaService.product.findUnique.mockResolvedValue(product);
      mockPrismaService.productImage.findMany.mockResolvedValue([]);

      mockPrismaService.$transaction.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('', {
          code: 'P2002',
          clientVersion: '1',
        }),
      );

      await expect(
        service.updateBaseProduct(productSlug, { slug: 'ocupado' } as any),
      ).rejects.toThrow(ConflictException);
    });
  });
});
