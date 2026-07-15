import { Test, TestingModule } from '@nestjs/testing';
import { CreateProductService } from '../../../../src/products/services/create-product.service';
import { PrismaService } from '../../../../src/prisma/prisma.service';
import { ProductUtilsService } from '../../../../src/products/services/product-utils.service';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

describe('CreateProductService', () => {
  let service: CreateProductService;
  let prismaService: PrismaService;
  let productUtils: ProductUtilsService;

  const mockPrismaService = {
    $transaction: jest.fn(),
  };

  const mockProductUtils = {
    generateSlug: jest.fn(),
    resolveTagAncestors: jest.fn(),
    extractProductDetails: jest.fn(),
    revertImages: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateProductService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: ProductUtilsService, useValue: mockProductUtils },
      ],
    }).compile();

    service = module.get<CreateProductService>(CreateProductService);
    prismaService = module.get<PrismaService>(PrismaService);
    productUtils = module.get<ProductUtilsService>(ProductUtilsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    const validDto = {
      name: 'Notebook',
      type: 'NOTEBOOK' as any,
      description: 'Desc',
      notebookDetails: { coverType: 'HARD' },
      imageUrls: ['http://img1'],
      tagIds: ['tag1'],
    };

    it('Debería crear un producto exitosamente', async () => {
      mockProductUtils.generateSlug.mockResolvedValue('notebook');
      mockProductUtils.resolveTagAncestors.mockResolvedValue(['tag1', 'tag2']);
      mockProductUtils.extractProductDetails.mockReturnValue({ coverType: 'HARD' });
      
      const createdProduct = { name: 'Notebook', slug: 'notebook' };
      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        // Simular que el callback ejecuta correctamente
        // En una prueba unitaria pura de NestJS con Prisma, no mockeamos tx tan profundamente 
        // a menos que sea necesario. Aquí devolvemos el valor deseado.
        return createdProduct;
      });

      const result = await service.create(validDto);

      expect(result).toEqual(createdProduct);
      expect(productUtils.generateSlug).toHaveBeenCalledWith(validDto.name);
      expect(productUtils.resolveTagAncestors).toHaveBeenCalledWith(validDto.tagIds);
      expect(prismaService.$transaction).toHaveBeenCalled();
    });

    it('Debería lanzar BadRequestException si falta notebookDetails para NOTEBOOK', async () => {
      const dto = { ...validDto, notebookDetails: undefined };
      await expect(service.create(dto)).rejects.toThrow(BadRequestException);
    });

    it('Debería lanzar ConflictException si prisma arroja P2002', async () => {
      mockProductUtils.generateSlug.mockResolvedValue('notebook');
      mockProductUtils.resolveTagAncestors.mockResolvedValue([]);
      
      mockPrismaService.$transaction.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('', { code: 'P2002', clientVersion: '1' })
      );

      await expect(service.create(validDto)).rejects.toThrow(ConflictException);
      expect(productUtils.revertImages).not.toHaveBeenCalled();
    });

    it('Debería revertir imágenes y relanzar el error si ocurre otro error', async () => {
      mockProductUtils.generateSlug.mockResolvedValue('notebook');
      mockProductUtils.resolveTagAncestors.mockResolvedValue([]);
      
      const error = new Error('Random error');
      mockPrismaService.$transaction.mockRejectedValue(error);
      mockProductUtils.revertImages.mockResolvedValue(undefined);

      await expect(service.create(validDto)).rejects.toThrow('Random error');
      expect(productUtils.revertImages).toHaveBeenCalledWith(validDto.imageUrls);
    });
  });
});
