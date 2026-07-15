import { Test, TestingModule } from '@nestjs/testing';
import { RefreshTokenService } from '../../../../src/auth/services/refresh-token.service';
import { JwtService } from '@nestjs/jwt';
import { FindUserByIdService } from '../../../../src/users/services/find-user-by-id.service';
import { UpdateRefreshTokenService } from '../../../../src/users/services/update-refresh-token.service';
import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt');

describe('RefreshTokenService', () => {
  let service: RefreshTokenService;
  let findUserByIdService: FindUserByIdService;
  let updateRefreshTokenService: UpdateRefreshTokenService;
  let jwtService: JwtService;

  const mockFindUserByIdService = {
    findById: jest.fn(),
  };

  const mockUpdateRefreshTokenService = {
    updateRefreshToken: jest.fn(),
  };

  const mockJwtService = {
    verify: jest.fn(),
    sign: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RefreshTokenService,
        {
          provide: FindUserByIdService,
          useValue: mockFindUserByIdService,
        },
        {
          provide: UpdateRefreshTokenService,
          useValue: mockUpdateRefreshTokenService,
        },
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile();

    service = module.get<RefreshTokenService>(RefreshTokenService);
    findUserByIdService = module.get<FindUserByIdService>(FindUserByIdService);
    updateRefreshTokenService = module.get<UpdateRefreshTokenService>(
      UpdateRefreshTokenService,
    );
    jwtService = module.get<JwtService>(JwtService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('refreshToken', () => {
    const validToken = 'valid-refresh-token';
    const payload = { sub: 'user-1', email: 'test@test.com', role: 'ADMIN' };
    const user = {
      id: 'user-1',
      email: 'test@test.com',
      role: 'ADMIN',
      refreshToken: 'hashed-db-token',
    };

    it('Debería retornar nuevos tokens si el refresh token es válido', async () => {
      mockJwtService.verify.mockReturnValue(payload);
      mockFindUserByIdService.findById.mockResolvedValue(user);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockJwtService.sign.mockReturnValueOnce('new-access-token');
      mockJwtService.sign.mockReturnValueOnce('new-refresh-token');
      (bcrypt.genSalt as jest.Mock).mockResolvedValue('salt');
      (bcrypt.hash as jest.Mock).mockResolvedValue('new-hashed-token');

      const result = await service.refreshToken(validToken);

      expect(result).toEqual({
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
      });
      expect(jwtService.verify).toHaveBeenCalledWith(validToken);
      expect(findUserByIdService.findById).toHaveBeenCalledWith(payload.sub);
      expect(bcrypt.compare).toHaveBeenCalledWith(
        validToken,
        user.refreshToken,
      );
      expect(jwtService.sign).toHaveBeenCalledWith({
        sub: user.id,
        email: user.email,
        role: user.role,
      });
      expect(jwtService.sign).toHaveBeenCalledWith(
        { sub: user.id, email: user.email, role: user.role },
        { expiresIn: '7d' },
      );
      expect(
        updateRefreshTokenService.updateRefreshToken,
      ).toHaveBeenCalledWith(user.id, 'new-hashed-token');
    });

    it('Debería lanzar UnauthorizedException si jwtService.verify falla', async () => {
      mockJwtService.verify.mockImplementation(() => {
        throw new Error('invalid token');
      });

      await expect(service.refreshToken(validToken)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(jwtService.verify).toHaveBeenCalledWith(validToken);
      expect(findUserByIdService.findById).not.toHaveBeenCalled();
    });

    it('Debería lanzar UnauthorizedException si el usuario no tiene refresh token en DB', async () => {
      mockJwtService.verify.mockReturnValue(payload);
      mockFindUserByIdService.findById.mockResolvedValue({
        ...user,
        refreshToken: null,
      });

      await expect(service.refreshToken(validToken)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('Debería lanzar UnauthorizedException si el token no coincide con el de la DB', async () => {
      mockJwtService.verify.mockReturnValue(payload);
      mockFindUserByIdService.findById.mockResolvedValue(user);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.refreshToken(validToken)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
