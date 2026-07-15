import { Test, TestingModule } from '@nestjs/testing';
import { DeleteTagService } from '../../../../src/tags/services/delete-tag.service';
import { PrismaService } from '../../../../src/prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';

describe('DeleteTagService', () => {
  let service: DeleteTagService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    tag: {
      findUnique: jest.fn(),
      delete: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeleteTagService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<DeleteTagService>(DeleteTagService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('remove', () => {
    it('Debería eliminar una etiqueta existente', async () => {
      const slug = 'mi-etiqueta';
      const existingTag = { id: '1', slug };

      mockPrismaService.tag.findUnique.mockResolvedValue(existingTag);
      mockPrismaService.tag.delete.mockResolvedValue(existingTag);

      const result = await service.remove(slug);

      expect(result).toEqual(existingTag);
      expect(prismaService.tag.findUnique).toHaveBeenCalledWith({
        where: { slug },
      });
      expect(prismaService.tag.delete).toHaveBeenCalledWith({
        where: { id: existingTag.id },
        omit: { id: true, parentId: true },
      });
    });

    it('Debería lanzar NotFoundException si la etiqueta no existe', async () => {
      mockPrismaService.tag.findUnique.mockResolvedValue(null);

      await expect(service.remove('no-existe')).rejects.toThrow(
        NotFoundException,
      );
      expect(prismaService.tag.delete).not.toHaveBeenCalled();
    });
  });
});
