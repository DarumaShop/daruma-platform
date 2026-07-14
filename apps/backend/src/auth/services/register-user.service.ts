import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { FindUserByEmailService } from '../../users/services/find-user-by-email.service';
import { CreateUserService } from '../../users/services/create-user.service';
import { GenerateInviteService } from './generate-invite.service';
import * as bcrypt from 'bcrypt';
import { RegisterDto } from '../dto/register.dto';

@Injectable()
export class RegisterUserService {
  constructor(
    private readonly findUserByEmailService: FindUserByEmailService,
    private readonly createUserService: CreateUserService,
    private readonly generateInviteService: GenerateInviteService,
  ) {}

  async register(dto: RegisterDto) {
    if (!this.generateInviteService.verifyInviteToken(dto.inviteToken)) {
      throw new UnauthorizedException(
        'Token de invitación inválido o expirado',
      );
    }

    const existingUser = await this.findUserByEmailService.findByEmail(
      dto.email,
    );
    if (existingUser) {
      throw new ConflictException('El correo ya está en uso');
    }

    const salt = await bcrypt.genSalt();
    const hashedPassword = await bcrypt.hash(dto.password, salt);

    const user = await this.createUserService.create({
      email: dto.email,
      username: dto.username,
      password: hashedPassword,
      firstName: dto.firstName,
      lastName: dto.lastName,
      role: 'ADMIN',
    });

    return {
      message: 'Administrador registrado con éxito',
      user: { id: user.id, email: user.email },
    };
  }
}
