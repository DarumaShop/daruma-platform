import { Test, TestingModule } from '@nestjs/testing';
import { FindUserByIdentifierService } from '../../../../src/users/services/find-user-by-identifier.service';
import { PrismaService } from '../../../../src/prisma/prisma.service';

describe('FindUserByIdentifierService', () => {
  let service: FindUserByIdentifierService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    user: {
      findFirst: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FindUserByIdentifierService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<FindUserByIdentifierService>(
      FindUserByIdentifierService,
    );
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findByIdentifier', () => {
    it('Debería buscar por email o username y retornar el usuario', async () => {
      const identifier = 'testuser';
      const user = { id: '1', username: 'testuser' };

      mockPrismaService.user.findFirst.mockResolvedValue(user);

      const result = await service.findByIdentifier(identifier);

      expect(result).toEqual(user);
      expect(prismaService.user.findFirst).toHaveBeenCalledWith({
        where: {
          OR: [{ email: identifier }, { username: identifier }],
        },
      });
    });

    it('Debería retornar null si el usuario no existe', async () => {
      const identifier = 'notfound';

      mockPrismaService.user.findFirst.mockResolvedValue(null);

      const result = await service.findByIdentifier(identifier);

      expect(result).toBeNull();
    });
  });
});
