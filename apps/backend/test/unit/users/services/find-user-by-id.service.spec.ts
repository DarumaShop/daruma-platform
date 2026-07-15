import { Test, TestingModule } from '@nestjs/testing';
import { FindUserByIdService } from '../../../../src/users/services/find-user-by-id.service';
import { PrismaService } from '../../../../src/prisma/prisma.service';

describe('FindUserByIdService', () => {
  let service: FindUserByIdService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FindUserByIdService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<FindUserByIdService>(FindUserByIdService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findById', () => {
    it('Debería retornar un usuario si existe el id', async () => {
      const id = '1';
      const user = { id, email: 'test@test.com' };

      mockPrismaService.user.findUnique.mockResolvedValue(user);

      const result = await service.findById(id);

      expect(result).toEqual(user);
      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id },
      });
    });

    it('Debería retornar null si el id no existe', async () => {
      const id = 'notfound';

      mockPrismaService.user.findUnique.mockResolvedValue(null);

      const result = await service.findById(id);

      expect(result).toBeNull();
      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id },
      });
    });
  });
});
