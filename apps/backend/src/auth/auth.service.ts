import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import * as bcrypt from 'bcrypt';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  generateInviteToken(): string {
    const inviteSecret =
      this.configService.get<string>('INVITE_SECRET') || 'invite-secret';
    return this.jwtService.sign(
      { purpose: 'admin_invite' },
      { secret: inviteSecret, expiresIn: '24h' },
    );
  }

  verifyInviteToken(token: string): boolean {
    try {
      const inviteSecret =
        this.configService.get<string>('INVITE_SECRET') || 'invite-secret';
      const decoded = this.jwtService.verify<{ purpose: string }>(token, {
        secret: inviteSecret,
      });
      return decoded.purpose === 'admin_invite';
    } catch {
      return false;
    }
  }

  async register(dto: RegisterDto) {
    if (!this.verifyInviteToken(dto.inviteToken)) {
      throw new UnauthorizedException(
        'Token de invitación inválido o expirado',
      );
    }

    const existingUser = await this.usersService.findByEmail(dto.email);
    if (existingUser) {
      throw new ConflictException('El correo ya está en uso');
    }

    const salt = await bcrypt.genSalt();
    const hashedPassword = await bcrypt.hash(dto.password, salt);

    const user = await this.usersService.create({
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

  async login(dto: LoginDto) {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) {
      throw new UnauthorizedException('Credenciales incorrectas');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Credenciales incorrectas');
    }

    const payload = { sub: user.id, email: user.email, role: user.role };

    return {
      accessToken: this.jwtService.sign(payload),
    };
  }
}
