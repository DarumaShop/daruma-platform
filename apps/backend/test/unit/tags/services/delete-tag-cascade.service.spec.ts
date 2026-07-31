import { Test, TestingModule } from '@nestjs/testing';
import { DeleteTagCascadeService } from '../../../../src/tags/services/delete-tag-cascade.service';
import { PrismaService } from '../../../../src/prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';

describe('DeleteTagCascadeService', () => {
  let service: DeleteTagCascadeService;
  let prismaService: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeleteTagCascadeService,
        {
          provide: PrismaService,
          useValue: {
            tag: {
              findMany: jest.fn(),
              deleteMany: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<DeleteTagCascadeService>(DeleteTagCascadeService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  describe('removeCascade', () => {
    it('Debería eliminar en cascada la etiqueta y todos sus descendientes', async () => {
      const mockTags = [
        { id: '1', slug: 'root', name: 'Root', parentId: null },
        { id: '2', slug: 'child1', name: 'Child 1', parentId: '1' },
        { id: '3', slug: 'child2', name: 'Child 2', parentId: '1' },
        { id: '4', slug: 'grandchild', name: 'Grandchild', parentId: '2' },
        { id: '5', slug: 'unrelated', name: 'Unrelated', parentId: null },
      ];

      (prismaService.tag.findMany as jest.Mock).mockResolvedValue(mockTags);
      (prismaService.tag.deleteMany as jest.Mock).mockResolvedValue({ count: 4 });

      const result = await service.removeCascade('root');

      expect(prismaService.tag.findMany).toHaveBeenCalled();
      expect(prismaService.tag.deleteMany).toHaveBeenCalledWith({
        where: { id: { in: ['1', '2', '4', '3'] } }, // El orden puede variar por el recorrido del árbol (DFS)
      });
      expect(result).toEqual({
        message: 'Se eliminaron 4 etiquetas en cascada',
        deletedCount: 4,
      });
    });

    it('Debería arrojar NotFoundException si la etiqueta raíz no se encuentra', async () => {
      const mockTags = [
        { id: '1', slug: 'root', name: 'Root', parentId: null },
      ];

      (prismaService.tag.findMany as jest.Mock).mockResolvedValue(mockTags);

      await expect(service.removeCascade('non-existent')).rejects.toThrow(
        NotFoundException,
      );
      expect(prismaService.tag.deleteMany).not.toHaveBeenCalled();
    });
  });
});
