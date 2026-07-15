import { Test, TestingModule } from '@nestjs/testing';
import { FindUserByEmailService } from '../../../../src/users/services/find-user-by-email.service';
import { PrismaService } from '../../../../src/prisma/prisma.service';

describe('FindUserByEmailService', () => {
  let service: FindUserByEmailService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FindUserByEmailService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<FindUserByEmailService>(FindUserByEmailService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findByEmail', () => {
    it('Debería retornar un usuario si existe el email', async () => {
      const email = 'test@test.com';
      const user = { id: '1', email };

      mockPrismaService.user.findUnique.mockResolvedValue(user);

      const result = await service.findByEmail(email);

      expect(result).toEqual(user);
      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email },
      });
    });

    it('Debería retornar null si el email no existe', async () => {
      const email = 'noexiste@test.com';

      mockPrismaService.user.findUnique.mockResolvedValue(null);

      const result = await service.findByEmail(email);

      expect(result).toBeNull();
      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email },
      });
    });
  });
});
