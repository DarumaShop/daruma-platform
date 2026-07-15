import { Test, TestingModule } from '@nestjs/testing';
import { LogoutUserService } from '../../../../src/auth/services/logout-user.service';
import { UpdateRefreshTokenService } from '../../../../src/users/services/update-refresh-token.service';

describe('LogoutUserService', () => {
  let service: LogoutUserService;
  let updateRefreshTokenService: UpdateRefreshTokenService;

  const mockUpdateRefreshTokenService = {
    updateRefreshToken: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LogoutUserService,
        {
          provide: UpdateRefreshTokenService,
          useValue: mockUpdateRefreshTokenService,
        },
      ],
    }).compile();

    service = module.get<LogoutUserService>(LogoutUserService);
    updateRefreshTokenService = module.get<UpdateRefreshTokenService>(
      UpdateRefreshTokenService,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('logout', () => {
    it('Debería setear el refresh token a null y retornar un mensaje', async () => {
      mockUpdateRefreshTokenService.updateRefreshToken.mockResolvedValue(
        undefined,
      );

      const result = await service.logout('user-123');

      expect(result).toEqual({ message: 'Sesión cerrada exitosamente' });
      expect(updateRefreshTokenService.updateRefreshToken).toHaveBeenCalledWith(
        'user-123',
        null,
      );
    });
  });
});
