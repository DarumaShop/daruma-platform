import { Test, TestingModule } from '@nestjs/testing';
import { UpdateTagService } from '../../../../src/tags/services/update-tag.service';
import { PrismaService } from '../../../../src/prisma/prisma.service';
import { NotFoundException, ConflictException } from '@nestjs/common';

describe('UpdateTagService', () => {
  let service: UpdateTagService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    tag: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UpdateTagService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<UpdateTagService>(UpdateTagService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('update', () => {
    const existingTag = { id: 'tag-1', slug: 'mi-etiqueta' };

    it('Debería actualizar una etiqueta correctamente sin cambiar parent', async () => {
      const dto = { name: 'Nuevo Nombre' };
      mockPrismaService.tag.findUnique.mockResolvedValue(existingTag);
      mockPrismaService.tag.update.mockResolvedValue({
        name: 'Nuevo Nombre',
        slug: 'mi-etiqueta',
      });

      const result = await service.update('mi-etiqueta', dto);

      expect(result.name).toBe('Nuevo Nombre');
      expect(prismaService.tag.update).toHaveBeenCalledWith({
        where: { id: existingTag.id },
        data: {
          name: dto.name,
          slug: undefined,
          parentId: undefined,
        },
        omit: { id: true, parentId: true },
      });
    });

    it('Debería lanzar NotFoundException si la etiqueta a actualizar no existe', async () => {
      mockPrismaService.tag.findUnique.mockResolvedValue(null);
      await expect(service.update('no-existe', {})).rejects.toThrow(
        NotFoundException,
      );
    });

    it('Debería remover el parentId si parentSlug es null', async () => {
      const dto = { parentSlug: null };
      mockPrismaService.tag.findUnique.mockResolvedValue(existingTag);
      mockPrismaService.tag.update.mockResolvedValue({});

      await service.update('mi-etiqueta', dto);

      expect(prismaService.tag.update).toHaveBeenCalledWith({
        where: { id: existingTag.id },
        data: {
          name: undefined,
          slug: undefined,
          parentId: null,
        },
        omit: { id: true, parentId: true },
      });
    });

    it('Debería actualizar el parentId si parentSlug es válido', async () => {
      const dto = { parentSlug: 'padre' };
      mockPrismaService.tag.findUnique
        .mockResolvedValueOnce(existingTag) // Busca la etiqueta a actualizar
        .mockResolvedValueOnce({ id: 'padre-1' }); // Busca el nuevo padre

      mockPrismaService.tag.update.mockResolvedValue({});

      await service.update('mi-etiqueta', dto);

      expect(prismaService.tag.update).toHaveBeenCalledWith({
        where: { id: existingTag.id },
        data: {
          name: undefined,
          slug: undefined,
          parentId: 'padre-1',
        },
        omit: { id: true, parentId: true },
      });
    });

    it('Debería lanzar ConflictException si parentSlug es igual al slug de la etiqueta', async () => {
      const dto = { parentSlug: 'mi-etiqueta' };
      mockPrismaService.tag.findUnique.mockResolvedValue(existingTag);

      await expect(service.update('mi-etiqueta', dto)).rejects.toThrow(
        ConflictException,
      );
    });

    it('Debería lanzar NotFoundException si el nuevo parentSlug no existe', async () => {
      const dto = { parentSlug: 'no-existe' };
      mockPrismaService.tag.findUnique
        .mockResolvedValueOnce(existingTag) // Etiqueta original
        .mockResolvedValueOnce(null); // Padre

      await expect(service.update('mi-etiqueta', dto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('Debería lanzar ConflictException si hay colisión de slug (P2002)', async () => {
      mockPrismaService.tag.findUnique.mockResolvedValue(existingTag);
      mockPrismaService.tag.update.mockRejectedValue({ code: 'P2002' });

      await expect(
        service.update('mi-etiqueta', { slug: 'ocupado' }),
      ).rejects.toThrow(ConflictException);
    });
  });
});
