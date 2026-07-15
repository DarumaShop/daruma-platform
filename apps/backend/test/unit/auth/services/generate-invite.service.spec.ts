import { Test, TestingModule } from '@nestjs/testing';
import { GenerateInviteService } from '../../../../src/auth/services/generate-invite.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

describe('GenerateInviteService', () => {
  let service: GenerateInviteService;
  let jwtService: JwtService;
  let configService: ConfigService;

  const mockJwtService = {
    sign: jest.fn(),
    verify: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GenerateInviteService,
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<GenerateInviteService>(GenerateInviteService);
    jwtService = module.get<JwtService>(JwtService);
    configService = module.get<ConfigService>(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('generateInviteToken', () => {
    it('Debería generar un token usando el INVITE_SECRET de configuración', () => {
      mockConfigService.get.mockReturnValue('mi-secreto');
      mockJwtService.sign.mockReturnValue('token-generado');

      const result = service.generateInviteToken();

      expect(result).toBe('token-generado');
      expect(configService.get).toHaveBeenCalledWith('INVITE_SECRET');
      expect(jwtService.sign).toHaveBeenCalledWith(
        { purpose: 'admin_invite' },
        { secret: 'mi-secreto', expiresIn: '12h' },
      );
    });

    it('Debería usar un secreto por defecto si INVITE_SECRET no está definido', () => {
      mockConfigService.get.mockReturnValue(undefined);
      mockJwtService.sign.mockReturnValue('token-por-defecto');

      const result = service.generateInviteToken();

      expect(result).toBe('token-por-defecto');
      expect(jwtService.sign).toHaveBeenCalledWith(
        { purpose: 'admin_invite' },
        { secret: 'invite-secret', expiresIn: '12h' },
      );
    });
  });

  describe('verifyInviteToken', () => {
    it('Debería retornar true si el token es válido y tiene el propósito correcto', () => {
      mockConfigService.get.mockReturnValue('mi-secreto');
      mockJwtService.verify.mockReturnValue({ purpose: 'admin_invite' });

      const result = service.verifyInviteToken('token-valido');

      expect(result).toBe(true);
      expect(jwtService.verify).toHaveBeenCalledWith('token-valido', {
        secret: 'mi-secreto',
      });
    });

    it('Debería retornar false si el token tiene un propósito incorrecto', () => {
      mockConfigService.get.mockReturnValue('mi-secreto');
      mockJwtService.verify.mockReturnValue({ purpose: 'otro_proposito' });

      const result = service.verifyInviteToken('token-invalido-proposito');

      expect(result).toBe(false);
    });

    it('Debería retornar false si verify lanza un error', () => {
      mockConfigService.get.mockReturnValue('mi-secreto');
      mockJwtService.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      const result = service.verifyInviteToken('token-malo');

      expect(result).toBe(false);
    });
  });
});
