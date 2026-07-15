import { Test, TestingModule } from '@nestjs/testing';
import { DeleteImageService } from '../../../../src/uploads/services/delete-image.service';
import { ConfigService } from '@nestjs/config';
import { createClient } from '@supabase/supabase-js';

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(),
}));

describe('DeleteImageService', () => {
  let service: DeleteImageService;
  let configService: ConfigService;

  const mockConfigService = {
    get: jest.fn((key) => {
      if (key === 'SUPABASE_URL') return 'http://mock-supabase-url';
      if (key === 'SUPABASE_SERVICE_ROLE_KEY') return 'mock-key';
      return null;
    }),
  };

  const mockSupabaseClient = {
    storage: {
      from: jest.fn().mockReturnThis(),
      remove: jest.fn(),
    },
  };

  beforeEach(async () => {
    (createClient as jest.Mock).mockReturnValue(mockSupabaseClient);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeleteImageService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<DeleteImageService>(DeleteImageService);
    configService = module.get<ConfigService>(ConfigService);
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
        new DeleteImageService(badConfigService as any);
      }).toThrow('Las credenciales de Supabase no están configuradas');
    });
  });

  describe('deleteImageFromSupabase', () => {
    it('Debería parsear la URL y eliminar la imagen de Supabase', async () => {
      mockSupabaseClient.storage.remove.mockResolvedValue({
        data: [{ name: 'imagen.webp' }],
        error: null,
      });

      const url = 'http://public-url.com/products-images/imagen.webp';
      await service.deleteImageFromSupabase(url);

      expect(mockSupabaseClient.storage.from).toHaveBeenCalledWith(
        'products-images',
      );
      expect(mockSupabaseClient.storage.remove).toHaveBeenCalledWith([
        'imagen.webp',
      ]);
    });

    it('No debería llamar a Supabase si la URL no contiene el bucket', async () => {
      const url = 'http://public-url.com/other/imagen.webp';
      await service.deleteImageFromSupabase(url);

      expect(mockSupabaseClient.storage.remove).not.toHaveBeenCalled();
    });

    it('Debería manejar y loggear errores retornados por Supabase silenciosamente', async () => {
      mockSupabaseClient.storage.remove.mockResolvedValue({
        data: null,
        error: new Error('Delete failed'),
      });

      const url = 'http://public-url.com/products-images/imagen.webp';
      await expect(service.deleteImageFromSupabase(url)).resolves.not.toThrow();
    });

    it('Debería atrapar excepciones y loggearlas silenciosamente', async () => {
      mockSupabaseClient.storage.remove.mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      const url = 'http://public-url.com/products-images/imagen.webp';
      await expect(service.deleteImageFromSupabase(url)).resolves.not.toThrow();
    });
  });
});
