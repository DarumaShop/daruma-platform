import { Test, TestingModule } from '@nestjs/testing';
import { CreateTagService } from '../../../../src/tags/services/create-tag.service';
import { PrismaService } from '../../../../src/prisma/prisma.service';
import { NotFoundException, ConflictException } from '@nestjs/common';

describe('CreateTagService', () => {
  let service: CreateTagService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    tag: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateTagService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<CreateTagService>(CreateTagService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('generateSlug', () => {
    it('Debería generar un slug simple si no existe colisión', async () => {
      mockPrismaService.tag.findUnique.mockResolvedValue(null);

      const slug = await service.generateSlug('Mi Etiqueta');

      expect(slug).toBe('mi-etiqueta');
      expect(prismaService.tag.findUnique).toHaveBeenCalledWith({
        where: { slug: 'mi-etiqueta' },
      });
    });

    it('Debería añadir un sufijo numérico si el slug base existe', async () => {
      mockPrismaService.tag.findUnique
        .mockResolvedValueOnce({ id: '1' }) // 'mi-etiqueta' existe
        .mockResolvedValueOnce(null); // 'mi-etiqueta-2' no existe

      const slug = await service.generateSlug('Mi Etiqueta');

      expect(slug).toBe('mi-etiqueta-2');
      expect(prismaService.tag.findUnique).toHaveBeenCalledTimes(2);
    });
  });

  describe('create', () => {
    it('Debería crear una etiqueta raíz sin padre', async () => {
      const dto = { name: 'Nueva Etiqueta' };
      mockPrismaService.tag.findUnique.mockResolvedValue(null); // Para el slug
      const createdTag = { name: 'Nueva Etiqueta', slug: 'nueva-etiqueta' };
      mockPrismaService.tag.create.mockResolvedValue(createdTag);

      const result = await service.create(dto);

      expect(result).toEqual(createdTag);
      expect(prismaService.tag.create).toHaveBeenCalledWith({
        data: {
          name: dto.name,
          slug: 'nueva-etiqueta',
          parentId: null,
        },
        omit: { id: true, parentId: true },
      });
    });

    it('Debería crear una etiqueta hija si parentSlug es válido', async () => {
      const dto = { name: 'Hija', parentSlug: 'padre' };
      mockPrismaService.tag.findUnique
        .mockResolvedValueOnce({ id: 'parent-1', slug: 'padre' }) // Busca el padre
        .mockResolvedValueOnce(null); // Para el slug 'hija'

      const createdTag = { name: 'Hija', slug: 'hija', parentId: 'parent-1' };
      mockPrismaService.tag.create.mockResolvedValue(createdTag);

      const result = await service.create(dto);

      expect(result).toEqual(createdTag);
      expect(prismaService.tag.create).toHaveBeenCalledWith({
        data: {
          name: dto.name,
          slug: 'hija',
          parentId: 'parent-1',
        },
        omit: { id: true, parentId: true },
      });
    });

    it('Debería lanzar NotFoundException si el parentSlug no existe', async () => {
      const dto = { name: 'Hija', parentSlug: 'no-existe' };
      mockPrismaService.tag.findUnique.mockResolvedValue(null);

      await expect(service.create(dto)).rejects.toThrow(NotFoundException);
      expect(prismaService.tag.create).not.toHaveBeenCalled();
    });

    it('Debería lanzar ConflictException si Prisma lanza error P2002', async () => {
      const dto = { name: 'Conflicto' };
      mockPrismaService.tag.findUnique.mockResolvedValue(null);
      mockPrismaService.tag.create.mockRejectedValue({ code: 'P2002' });

      await expect(service.create(dto)).rejects.toThrow(ConflictException);
    });

    it('Debería propagar otros errores de Prisma durante la creación', async () => {
      const dto = { name: 'Error' };
      mockPrismaService.tag.findUnique.mockResolvedValue(null);
      mockPrismaService.tag.create.mockRejectedValue(new Error('DB Error'));

      await expect(service.create(dto)).rejects.toThrow('DB Error');
    });
  });
});
