import { Test, TestingModule } from '@nestjs/testing';
import { GetProductsService } from '../../../../src/products/services/get-products.service';
import { PrismaService } from '../../../../src/prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';

describe('GetProductsService', () => {
  let service: GetProductsService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    product: {
      count: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetProductsService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<GetProductsService>(GetProductsService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAllPublic', () => {
    it('Debería retornar productos activos y meta información', async () => {
      mockPrismaService.product.count.mockResolvedValue(1);
      const mockProduct = { name: 'Prod1', isActive: true };
      mockPrismaService.product.findMany.mockResolvedValue([mockProduct]);

      const result = await service.findAllPublic({ page: 1, limit: 10 });

      expect(result.data).toEqual([mockProduct]);
      expect(result.meta.totalItems).toBe(1);
      expect(prismaService.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ isActive: true }),
        }),
      );
    });
  });

  describe('findAllAdmin', () => {
    it('Debería retornar todos los productos (activos e inactivos)', async () => {
      mockPrismaService.product.count.mockResolvedValue(2);
      const mockProducts = [{ name: 'P1' }, { name: 'P2' }];
      mockPrismaService.product.findMany.mockResolvedValue(mockProducts);

      const result = await service.findAllAdmin({ type: 'SIMPLE' as any });

      expect(result.data).toEqual(mockProducts);
      expect(result.meta.totalItems).toBe(2);
      expect(prismaService.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ type: 'SIMPLE' }),
        }),
      );
    });

    it('Debería aplicar filtros de búsqueda', async () => {
      mockPrismaService.product.count.mockResolvedValue(0);
      mockPrismaService.product.findMany.mockResolvedValue([]);

      await service.findAllAdmin({ search: 'rojo grande' });

      expect(prismaService.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            AND: expect.arrayContaining([
              expect.objectContaining({ OR: expect.any(Array) }),
            ]),
          }),
        }),
      );
    });
  });

  describe('findOne', () => {
    it('Debería retornar el producto activo', async () => {
      const mockProduct = { name: 'P1', isActive: true };
      mockPrismaService.product.findFirst.mockResolvedValue(mockProduct);

      const result = await service.findOne('p1-slug');

      expect(result).toEqual(mockProduct);
      expect(prismaService.product.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { slug: 'p1-slug', isActive: true },
        }),
      );
    });

    it('Debería lanzar NotFoundException si no existe o no está activo', async () => {
      mockPrismaService.product.findFirst.mockResolvedValue(null);
      await expect(service.findOne('p1-slug')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findOneAdmin', () => {
    it('Debería retornar el producto sin importar si está activo', async () => {
      const mockProduct = { name: 'P1', isActive: false };
      mockPrismaService.product.findUnique.mockResolvedValue(mockProduct);

      const result = await service.findOneAdmin('p1-slug');

      expect(result).toEqual(mockProduct);
      expect(prismaService.product.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { slug: 'p1-slug' },
        }),
      );
    });

    it('Debería lanzar NotFoundException si no existe', async () => {
      mockPrismaService.product.findUnique.mockResolvedValue(null);
      await expect(service.findOneAdmin('p1-slug')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
