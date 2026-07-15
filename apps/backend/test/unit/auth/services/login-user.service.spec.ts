import { Test, TestingModule } from '@nestjs/testing';
import { LoginUserService } from '../../../../src/auth/services/login-user.service';
import { JwtService } from '@nestjs/jwt';
import { FindUserByIdentifierService } from '../../../../src/users/services/find-user-by-identifier.service';
import { UpdateRefreshTokenService } from '../../../../src/users/services/update-refresh-token.service';
import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt');

describe('LoginUserService', () => {
  let service: LoginUserService;
  let findUserByIdentifierService: FindUserByIdentifierService;
  let updateRefreshTokenService: UpdateRefreshTokenService;
  let jwtService: JwtService;

  const mockFindUserByIdentifierService = {
    findByIdentifier: jest.fn(),
  };

  const mockUpdateRefreshTokenService = {
    updateRefreshToken: jest.fn(),
  };

  const mockJwtService = {
    sign: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LoginUserService,
        {
          provide: FindUserByIdentifierService,
          useValue: mockFindUserByIdentifierService,
        },
        {
          provide: UpdateRefreshTokenService,
          useValue: mockUpdateRefreshTokenService,
        },
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile();

    service = module.get<LoginUserService>(LoginUserService);
    findUserByIdentifierService = module.get<FindUserByIdentifierService>(
      FindUserByIdentifierService,
    );
    updateRefreshTokenService = module.get<UpdateRefreshTokenService>(
      UpdateRefreshTokenService,
    );
    jwtService = module.get<JwtService>(JwtService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('login', () => {
    const dto = { identifier: 'test@test.com', password: 'password123' };
    const user = {
      id: '1',
      email: 'test@test.com',
      password: 'hashedpassword',
      role: 'ADMIN',
    };

    it('Debería retornar tokens si las credenciales son válidas', async () => {
      mockFindUserByIdentifierService.findByIdentifier.mockResolvedValue(user);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockJwtService.sign.mockReturnValueOnce('access-token');
      mockJwtService.sign.mockReturnValueOnce('refresh-token');
      (bcrypt.genSalt as jest.Mock).mockResolvedValue('salt');
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-refresh-token');

      const result = await service.login(dto);

      expect(result).toEqual({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      });
      expect(
        findUserByIdentifierService.findByIdentifier,
      ).toHaveBeenCalledWith(dto.identifier);
      expect(bcrypt.compare).toHaveBeenCalledWith(
        dto.password,
        user.password,
      );
      expect(jwtService.sign).toHaveBeenCalledWith(
        { sub: user.id, email: user.email, role: user.role },
        { expiresIn: '24h' }
      );
      expect(jwtService.sign).toHaveBeenCalledWith(
        { sub: user.id, email: user.email, role: user.role },
        { expiresIn: '7d' },
      );
      expect(
        updateRefreshTokenService.updateRefreshToken,
      ).toHaveBeenCalledWith(user.id, 'hashed-refresh-token');
    });

    it('Debería lanzar UnauthorizedException si el usuario no existe', async () => {
      mockFindUserByIdentifierService.findByIdentifier.mockResolvedValue(null);

      await expect(service.login(dto)).rejects.toThrow(UnauthorizedException);
      expect(
        findUserByIdentifierService.findByIdentifier,
      ).toHaveBeenCalledWith(dto.identifier);
    });

    it('Debería lanzar UnauthorizedException si la contraseña es incorrecta', async () => {
      mockFindUserByIdentifierService.findByIdentifier.mockResolvedValue(user);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.login(dto)).rejects.toThrow(UnauthorizedException);
      expect(bcrypt.compare).toHaveBeenCalledWith(
        dto.password,
        user.password,
      );
    });
  });
});
