import { Test, TestingModule } from '@nestjs/testing';
import { GetTagsService } from '../../../../src/tags/services/get-tags.service';
import { PrismaService } from '../../../../src/prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';

describe('GetTagsService', () => {
  let service: GetTagsService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    tag: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetTagsService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<GetTagsService>(GetTagsService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('Debería retornar un listado plano filtrado si hay un término de búsqueda', async () => {
      const mockTags = [
        { id: '1', name: 'Libretas', slug: 'libretas', parentId: null },
      ];
      mockPrismaService.tag.findMany.mockResolvedValue(mockTags);

      const result = await service.findAll('lib');

      expect(result).toEqual([{ name: 'Libretas', slug: 'libretas' }]);
      expect(prismaService.tag.findMany).toHaveBeenCalledWith({
        where: { name: { contains: 'lib', mode: 'insensitive' } },
        include: { _count: { select: { products: { where: { isActive: true } } } } },
      });
    });

    it('Debería retornar un árbol limpio si no hay término de búsqueda', async () => {
      const mockTags = [
        { id: '1', name: 'Root', slug: 'root', parentId: null },
        { id: '2', name: 'Child', slug: 'child', parentId: '1' },
      ];
      mockPrismaService.tag.findMany.mockResolvedValue(mockTags);

      const result = await service.findAll();

      expect(result).toEqual([
        {
          name: 'Root',
          slug: 'root',
          children: [{ name: 'Child', slug: 'child', children: [] }],
        },
      ]);
    });
  });

  describe('findOne', () => {
    it('Debería retornar una sola etiqueta si withTree es false', async () => {
      const slug = 'mi-etiqueta';
      const mockTag = { name: 'Mi Etiqueta', slug };
      mockPrismaService.tag.findUnique.mockResolvedValue(mockTag);

      const result = await service.findOne(slug, false);

      expect(result).toEqual(mockTag);
      expect(prismaService.tag.findUnique).toHaveBeenCalledWith({
        where: { slug },
        omit: { id: true, parentId: true },
        include: { _count: { select: { products: { where: { isActive: true } } } } },
      });
    });

    it('Debería lanzar NotFoundException si la etiqueta no existe (withTree = false)', async () => {
      mockPrismaService.tag.findUnique.mockResolvedValue(null);

      await expect(service.findOne('no-existe', false)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('Debería retornar un árbol completo a partir de una etiqueta (withTree = true)', async () => {
      const slug = 'padre';
      const mockTags = [
        { id: '1', name: 'Padre', slug: 'padre', parentId: null },
        { id: '2', name: 'Hijo', slug: 'hijo', parentId: '1' },
        { id: '3', name: 'Otro', slug: 'otro', parentId: null },
      ];
      mockPrismaService.tag.findMany.mockResolvedValue(mockTags);

      const result = await service.findOne(slug, true);

      expect(result).toEqual({
        name: 'Padre',
        slug: 'padre',
        children: [{ name: 'Hijo', slug: 'hijo', children: [] }],
      });
    });

    it('Debería lanzar NotFoundException si no encuentra la raíz del árbol (withTree = true)', async () => {
      mockPrismaService.tag.findMany.mockResolvedValue([]);

      await expect(service.findOne('no-existe', true)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
