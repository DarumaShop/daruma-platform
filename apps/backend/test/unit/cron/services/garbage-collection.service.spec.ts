import { Test, TestingModule } from '@nestjs/testing';
import { GarbageCollectorService } from '../../../../src/cron/services/garbage-collection.service';
import { PrismaService } from '../../../../src/prisma/prisma.service';
import { DeleteImageService } from '../../../../src/uploads/services/delete-image.service';

describe('GarbageCollectorService', () => {
  let service: GarbageCollectorService;
  let prismaService: PrismaService;
  let deleteImageService: DeleteImageService;

  const mockPrismaService = {
    pendingUpload: {
      findMany: jest.fn(),
      delete: jest.fn(),
    },
  };

  const mockDeleteImageService = {
    deleteImageFromSupabase: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GarbageCollectorService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: DeleteImageService, useValue: mockDeleteImageService },
      ],
    }).compile();

    service = module.get<GarbageCollectorService>(GarbageCollectorService);
    prismaService = module.get<PrismaService>(PrismaService);
    deleteImageService = module.get<DeleteImageService>(DeleteImageService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('handleOrphanedImages', () => {
    it('Debería loggear y retornar si no hay imágenes huérfanas', async () => {
      mockPrismaService.pendingUpload.findMany.mockResolvedValue([]);

      await service.handleOrphanedImages();

      expect(prismaService.pendingUpload.findMany).toHaveBeenCalled();
      expect(deleteImageService.deleteImageFromSupabase).not.toHaveBeenCalled();
      expect(prismaService.pendingUpload.delete).not.toHaveBeenCalled();
    });

    it('Debería eliminar las imágenes en Supabase y de la base de datos si existen', async () => {
      const mockUploads = [
        { id: '1', url: 'http://url1.com', createdAt: new Date('2020-01-01') },
        { id: '2', url: 'http://url2.com', createdAt: new Date('2020-01-01') },
      ];
      mockPrismaService.pendingUpload.findMany.mockResolvedValue(mockUploads);
      mockDeleteImageService.deleteImageFromSupabase.mockResolvedValue(
        undefined,
      );
      mockPrismaService.pendingUpload.delete.mockResolvedValue(undefined);

      await service.handleOrphanedImages();

      expect(deleteImageService.deleteImageFromSupabase).toHaveBeenCalledTimes(
        2,
      );
      expect(deleteImageService.deleteImageFromSupabase).toHaveBeenCalledWith(
        'http://url1.com',
      );
      expect(deleteImageService.deleteImageFromSupabase).toHaveBeenCalledWith(
        'http://url2.com',
      );

      expect(prismaService.pendingUpload.delete).toHaveBeenCalledTimes(2);
      expect(prismaService.pendingUpload.delete).toHaveBeenCalledWith({
        where: { id: '1' },
      });
      expect(prismaService.pendingUpload.delete).toHaveBeenCalledWith({
        where: { id: '2' },
      });
    });

    it('Debería atrapar y loggear errores sin lanzar excepción', async () => {
      mockPrismaService.pendingUpload.findMany.mockRejectedValue(
        new Error('DB Error'),
      );

      await expect(service.handleOrphanedImages()).resolves.not.toThrow();
    });
  });
});
