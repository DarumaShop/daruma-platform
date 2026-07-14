import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { FindUserByIdentifierService } from '../../users/services/find-user-by-identifier.service';
import { UpdateRefreshTokenService } from '../../users/services/update-refresh-token.service';
import * as bcrypt from 'bcrypt';
import { LoginDto } from '../dto/login.dto';

@Injectable()
export class LoginUserService {
  constructor(
    private readonly findUserByIdentifierService: FindUserByIdentifierService,
    private readonly updateRefreshTokenService: UpdateRefreshTokenService,
    private readonly jwtService: JwtService,
  ) {}

  async login(dto: LoginDto) {
    const user = await this.findUserByIdentifierService.findByIdentifier(
      dto.identifier,
    );
    if (!user) {
      throw new UnauthorizedException('Credenciales incorrectas');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Credenciales incorrectas');
    }

    const payload = { sub: user.id, email: user.email, role: user.role };

    const accessToken = this.jwtService.sign(payload);
    const refreshToken = this.jwtService.sign(payload, { expiresIn: '7d' });

    const salt = await bcrypt.genSalt();
    const hashedRefreshToken = await bcrypt.hash(refreshToken, salt);
    await this.updateRefreshTokenService.updateRefreshToken(
      user.id,
      hashedRefreshToken,
    );

    return {
      accessToken,
      refreshToken,
    };
  }
}
