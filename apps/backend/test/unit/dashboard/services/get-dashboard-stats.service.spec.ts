import { Test, TestingModule } from '@nestjs/testing';
import { GetDashboardStatsService } from '../../../../src/dashboard/services/get-dashboard-stats.service';
import { PrismaService } from '../../../../src/prisma/prisma.service';

describe('GetDashboardStatsService', () => {
  let service: GetDashboardStatsService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    product: { count: jest.fn() },
    tag: { count: jest.fn() },
    productVariant: { findMany: jest.fn() },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetDashboardStatsService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<GetDashboardStatsService>(GetDashboardStatsService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getStats', () => {
    it('Debería retornar las estadísticas correctamente', async () => {
      mockPrismaService.product.count.mockResolvedValue(10);
      mockPrismaService.tag.count.mockResolvedValue(5);
      mockPrismaService.productVariant.findMany.mockResolvedValue([
        {
          id: 'v1',
          productId: 'p1',
          sku: 'SKU-1',
          stock: 0,
          product: { name: 'Producto 1', type: 'SIMPLE' },
        },
      ]);

      const result = await service.getStats();

      expect(result).toEqual({
        totalActiveProducts: 10,
        totalTags: 5,
        outOfStockAlerts: [
          {
            variantId: 'v1',
            productId: 'p1',
            productName: 'Producto 1',
            productType: 'SIMPLE',
            sku: 'SKU-1',
            stock: 0,
          },
        ],
      });

      expect(prismaService.product.count).toHaveBeenCalledWith({
        where: { isActive: true },
      });
      expect(prismaService.tag.count).toHaveBeenCalled();
      expect(prismaService.productVariant.findMany).toHaveBeenCalledWith({
        where: {
          isActive: true,
          stock: { lte: 0 },
          product: { isActive: true },
        },
        include: {
          product: { select: { name: true, type: true } },
        },
      });
    });
  });
});
