import { Test, TestingModule } from '@nestjs/testing';
import { CreateUserService } from '../../../../src/users/services/create-user.service';
import { PrismaService } from '../../../../src/prisma/prisma.service';

describe('CreateUserService', () => {
  let service: CreateUserService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    user: {
      create: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateUserService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<CreateUserService>(CreateUserService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('Debería crear un usuario', async () => {
      const data = { email: 'test@test.com', password: 'hash' };
      const createdUser = { id: '1', ...data };

      mockPrismaService.user.create.mockResolvedValue(createdUser);

      const result = await service.create(data as any);

      expect(result).toEqual(createdUser);
      expect(prismaService.user.create).toHaveBeenCalledWith({ data });
    });
  });
});
