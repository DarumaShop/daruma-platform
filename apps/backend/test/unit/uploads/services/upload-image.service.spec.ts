import { Test, TestingModule } from '@nestjs/testing';
import { UploadImageService } from '../../../../src/uploads/services/upload-image.service';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../../src/prisma/prisma.service';
import { InternalServerErrorException } from '@nestjs/common';
import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(),
}));

jest.mock('sharp', () => {
  const sharpMock = {
    extract: jest.fn().mockReturnThis(),
    resize: jest.fn().mockReturnThis(),
    webp: jest.fn().mockReturnThis(),
    toBuffer: jest.fn().mockResolvedValue(Buffer.from('processed-image')),
  };
  return jest.fn(() => sharpMock);
});

jest.mock('node:crypto', () => ({
  randomUUID: jest.fn().mockReturnValue('mock-uuid'),
}));

describe('UploadImageService', () => {
  let service: UploadImageService;
  let prismaService: PrismaService;

  const mockConfigService = {
    get: jest.fn((key) => {
      if (key === 'SUPABASE_URL') return 'http://mock-supabase-url';
      if (key === 'SUPABASE_SERVICE_ROLE_KEY') return 'mock-key';
      return null;
    }),
  };

  const mockPrismaService = {
    pendingUpload: {
      create: jest.fn(),
    },
  };

  const mockSupabaseClient = {
    storage: {
      from: jest.fn().mockReturnThis(),
      upload: jest.fn(),
      getPublicUrl: jest.fn(),
    },
  };

  beforeEach(async () => {
    (createClient as jest.Mock).mockReturnValue(mockSupabaseClient);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UploadImageService,
        { provide: ConfigService, useValue: mockConfigService },
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<UploadImageService>(UploadImageService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Initialization', () => {
    it('Debería lanzar error si falta la configuración de Supabase', () => {
      const badConfigService = {
        get: jest.fn().mockReturnValue(undefined),
      };

      expect(() => {
        new UploadImageService(
          badConfigService as any,
          mockPrismaService as any,
        );
      }).toThrow('Las credenciales de Supabase no están configuradas');
    });
  });

  describe('processAndUploadImage', () => {
    const file = {
      buffer: Buffer.from('mock-image'),
      originalname: 'test.png',
    };
    const options = { targetWidth: 100, targetHeight: 100 };

    it('Debería procesar, subir la imagen a Supabase y guardar en PendingUpload', async () => {
      mockSupabaseClient.storage.upload.mockResolvedValue({
        data: { path: 'mock-uuid.webp' },
        error: null,
      });
      mockSupabaseClient.storage.getPublicUrl.mockReturnValue({
        data: { publicUrl: 'http://public-url.com/mock-uuid.webp' },
      });

      const result = await service.processAndUploadImage(file, options);

      expect(result).toBe('http://public-url.com/mock-uuid.webp');
      expect(sharp).toHaveBeenCalledWith(file.buffer);
      expect(mockSupabaseClient.storage.upload).toHaveBeenCalledWith(
        'mock-uuid.webp',
        expect.any(Buffer),
        expect.any(Object),
      );
      expect(prismaService.pendingUpload.create).toHaveBeenCalledWith({
        data: { url: 'http://public-url.com/mock-uuid.webp' },
      });
    });

    it('Debería extraer sección (crop) de la imagen si se proveen coordenadas', async () => {
      mockSupabaseClient.storage.upload.mockResolvedValue({
        data: { path: 'mock-uuid.webp' },
        error: null,
      });
      mockSupabaseClient.storage.getPublicUrl.mockReturnValue({
        data: { publicUrl: 'http://public-url.com/mock-uuid.webp' },
      });

      const cropOptions = {
        cropX: 10,
        cropY: 10,
        cropWidth: 50,
        cropHeight: 50,
      };
      await service.processAndUploadImage(file, cropOptions);

      const sharpInstance = (sharp as unknown as jest.Mock)();

      expect(sharpInstance.extract).toHaveBeenCalledWith({
        left: 10,
        top: 10,
        width: 50,
        height: 50,
      });
    });

    it('Debería lanzar InternalServerErrorException si falla la subida a Supabase', async () => {
      mockSupabaseClient.storage.upload.mockResolvedValue({
        data: null,
        error: new Error('Upload failed'),
      });

      await expect(
        service.processAndUploadImage(file, options),
      ).rejects.toThrow(InternalServerErrorException);
    });
  });
});
