import { Test, TestingModule } from '@nestjs/testing';
import { UpdateRefreshTokenService } from '../../../../src/users/services/update-refresh-token.service';
import { PrismaService } from '../../../../src/prisma/prisma.service';

describe('UpdateRefreshTokenService', () => {
  let service: UpdateRefreshTokenService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    user: {
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UpdateRefreshTokenService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<UpdateRefreshTokenService>(UpdateRefreshTokenService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('updateRefreshToken', () => {
    it('Debería actualizar el refreshToken de un usuario', async () => {
      const id = '1';
      const refreshToken = 'new-token';
      const updatedUser = { id, refreshToken };

      mockPrismaService.user.update.mockResolvedValue(updatedUser);

      const result = await service.updateRefreshToken(id, refreshToken);

      expect(result).toEqual(updatedUser);
      expect(prismaService.user.update).toHaveBeenCalledWith({
        where: { id },
        data: { refreshToken },
      });
    });

    it('Debería setear el refreshToken en null', async () => {
      const id = '1';

      mockPrismaService.user.update.mockResolvedValue({ id, refreshToken: null });

      const result = await service.updateRefreshToken(id, null);

      expect(result).toEqual({ id, refreshToken: null });
      expect(prismaService.user.update).toHaveBeenCalledWith({
        where: { id },
        data: { refreshToken: null },
      });
    });
  });
});
