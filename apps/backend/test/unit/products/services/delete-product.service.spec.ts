import { Test, TestingModule } from '@nestjs/testing';
import { DeleteProductService } from '../../../../src/products/services/delete-product.service';
import { PrismaService } from '../../../../src/prisma/prisma.service';
import { DeleteImageService } from '../../../../src/uploads/services/delete-image.service';
import { NotFoundException } from '@nestjs/common';

describe('DeleteProductService', () => {
  let service: DeleteProductService;
  let prismaService: PrismaService;
  let deleteImageService: DeleteImageService;

  const mockPrismaService = {
    product: {
      findUnique: jest.fn(),
      delete: jest.fn(),
    },
  };

  const mockDeleteImageService = {
    deleteImageFromSupabase: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeleteProductService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: DeleteImageService, useValue: mockDeleteImageService },
      ],
    }).compile();

    service = module.get<DeleteProductService>(DeleteProductService);
    prismaService = module.get<PrismaService>(PrismaService);
    deleteImageService = module.get<DeleteImageService>(DeleteImageService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('remove', () => {
    it('Debería eliminar el producto y sus imágenes', async () => {
      const slug = 'mi-producto';
      const mockProduct = {
        id: 'prod-1',
        slug,
        images: [{ url: 'http://img1' }, { url: 'http://img2' }],
      };

      mockPrismaService.product.findUnique.mockResolvedValue(mockProduct);
      mockPrismaService.product.delete.mockResolvedValue({ name: 'Prod' });
      mockDeleteImageService.deleteImageFromSupabase.mockResolvedValue(undefined);

      const result = await service.remove(slug);

      expect(result).toEqual({
        message: 'Producto eliminado permanentemente',
        product: { name: 'Prod' },
      });

      expect(prismaService.product.findUnique).toHaveBeenCalledWith({
        where: { slug },
        include: { images: true },
      });

      expect(deleteImageService.deleteImageFromSupabase).toHaveBeenCalledTimes(2);
      expect(deleteImageService.deleteImageFromSupabase).toHaveBeenCalledWith('http://img1');
      expect(deleteImageService.deleteImageFromSupabase).toHaveBeenCalledWith('http://img2');

      expect(prismaService.product.delete).toHaveBeenCalledWith({
        where: { slug },
        omit: { id: true },
      });
    });

    it('Debería lanzar NotFoundException si el producto no existe', async () => {
      mockPrismaService.product.findUnique.mockResolvedValue(null);

      await expect(service.remove('no-existe')).rejects.toThrow(
        NotFoundException,
      );

      expect(deleteImageService.deleteImageFromSupabase).not.toHaveBeenCalled();
      expect(prismaService.product.delete).not.toHaveBeenCalled();
    });
  });
});
