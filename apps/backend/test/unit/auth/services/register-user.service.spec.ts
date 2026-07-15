import { Test, TestingModule } from '@nestjs/testing';
import { RegisterUserService } from '../../../../src/auth/services/register-user.service';
import { FindUserByEmailService } from '../../../../src/users/services/find-user-by-email.service';
import { CreateUserService } from '../../../../src/users/services/create-user.service';
import { GenerateInviteService } from '../../../../src/auth/services/generate-invite.service';
import { UnauthorizedException, ConflictException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt');

describe('RegisterUserService', () => {
  let service: RegisterUserService;
  let findUserByEmailService: FindUserByEmailService;
  let createUserService: CreateUserService;
  let generateInviteService: GenerateInviteService;

  const mockFindUserByEmailService = {
    findByEmail: jest.fn(),
  };

  const mockCreateUserService = {
    create: jest.fn(),
  };

  const mockGenerateInviteService = {
    verifyInviteToken: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RegisterUserService,
        {
          provide: FindUserByEmailService,
          useValue: mockFindUserByEmailService,
        },
        { provide: CreateUserService, useValue: mockCreateUserService },
        {
          provide: GenerateInviteService,
          useValue: mockGenerateInviteService,
        },
      ],
    }).compile();

    service = module.get<RegisterUserService>(RegisterUserService);
    findUserByEmailService = module.get<FindUserByEmailService>(
      FindUserByEmailService,
    );
    createUserService = module.get<CreateUserService>(CreateUserService);
    generateInviteService = module.get<GenerateInviteService>(
      GenerateInviteService,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    const dto = {
      email: 'test@test.com',
      username: 'testuser',
      password: 'password123',
      firstName: 'Test',
      lastName: 'User',
      inviteToken: 'valid-token',
    };

    it('Debería registrar un administrador con éxito si el token es válido y el correo no existe', async () => {
      mockGenerateInviteService.verifyInviteToken.mockReturnValue(true);
      mockFindUserByEmailService.findByEmail.mockResolvedValue(null);
      (bcrypt.genSalt as jest.Mock).mockResolvedValue('salt');
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');
      mockCreateUserService.create.mockResolvedValue({
        id: 'user-1',
        email: 'test@test.com',
      });

      const result = await service.register(dto);

      expect(result).toEqual({
        message: 'Administrador registrado con éxito',
        user: { id: 'user-1', email: 'test@test.com' },
      });
      expect(generateInviteService.verifyInviteToken).toHaveBeenCalledWith(
        dto.inviteToken,
      );
      expect(findUserByEmailService.findByEmail).toHaveBeenCalledWith(
        dto.email,
      );
      expect(createUserService.create).toHaveBeenCalledWith({
        email: dto.email,
        username: dto.username,
        password: 'hashed-password',
        firstName: dto.firstName,
        lastName: dto.lastName,
        role: 'ADMIN',
      });
    });

    it('Debería lanzar UnauthorizedException si el token de invitación es inválido', async () => {
      mockGenerateInviteService.verifyInviteToken.mockReturnValue(false);

      await expect(service.register(dto)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(generateInviteService.verifyInviteToken).toHaveBeenCalledWith(
        dto.inviteToken,
      );
      expect(findUserByEmailService.findByEmail).not.toHaveBeenCalled();
    });

    it('Debería lanzar ConflictException si el correo ya está en uso', async () => {
      mockGenerateInviteService.verifyInviteToken.mockReturnValue(true);
      mockFindUserByEmailService.findByEmail.mockResolvedValue({
        id: 'existing-user',
      });

      await expect(service.register(dto)).rejects.toThrow(ConflictException);
      expect(findUserByEmailService.findByEmail).toHaveBeenCalledWith(
        dto.email,
      );
      expect(createUserService.create).not.toHaveBeenCalled();
    });
  });
});
