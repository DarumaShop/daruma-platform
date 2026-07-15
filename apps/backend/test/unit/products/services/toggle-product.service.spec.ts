import { Test, TestingModule } from '@nestjs/testing';
import { ToggleProductService } from '../../../../src/products/services/toggle-product.service';
import { PrismaService } from '../../../../src/prisma/prisma.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('ToggleProductService', () => {
  let service: ToggleProductService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    product: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ToggleProductService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<ToggleProductService>(ToggleProductService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('deactivate', () => {
    it('Debería desactivar un producto', async () => {
      const slug = 'mi-producto';
      const deactivatedProduct = { slug, isActive: false };
      mockPrismaService.product.update.mockResolvedValue(deactivatedProduct);

      const result = await service.deactivate(slug);

      expect(result).toEqual({
        message: 'Producto desactivado correctamente',
        product: deactivatedProduct,
      });

      expect(prismaService.product.update).toHaveBeenCalledWith({
        where: { slug },
        data: { isActive: false },
        omit: { id: true },
      });
    });
  });

  describe('activate', () => {
    it('Debería activar el producto si tiene variantes', async () => {
      const slug = 'mi-producto';
      mockPrismaService.product.findUnique.mockResolvedValue({
        id: '1',
        slug,
        variants: [{ id: 'var-1' }],
      });

      const activatedProduct = { slug, isActive: true };
      mockPrismaService.product.update.mockResolvedValue(activatedProduct);

      const result = await service.activate(slug);

      expect(result).toEqual({
        message: 'Producto activado correctamente',
        product: activatedProduct,
      });

      expect(prismaService.product.findUnique).toHaveBeenCalledWith({
        where: { slug },
        include: { variants: true },
      });

      expect(prismaService.product.update).toHaveBeenCalledWith({
        where: { slug },
        data: { isActive: true },
        omit: { id: true },
      });
    });

    it('Debería lanzar NotFoundException si el producto no existe', async () => {
      mockPrismaService.product.findUnique.mockResolvedValue(null);

      await expect(service.activate('no-existe')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('Debería lanzar BadRequestException si el producto no tiene variantes', async () => {
      mockPrismaService.product.findUnique.mockResolvedValue({
        id: '1',
        slug: 'sin-variantes',
        variants: [],
      });

      await expect(service.activate('sin-variantes')).rejects.toThrow(
        BadRequestException,
      );

      expect(prismaService.product.update).not.toHaveBeenCalled();
    });
  });
});
