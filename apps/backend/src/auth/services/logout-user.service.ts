import { Injectable } from '@nestjs/common';
import { UpdateRefreshTokenService } from '../../users/services/update-refresh-token.service';

@Injectable()
export class LogoutUserService {
  constructor(
    private readonly updateRefreshTokenService: UpdateRefreshTokenService,
  ) {}

  async logout(userId: string) {
    await this.updateRefreshTokenService.updateRefreshToken(userId, null);
    return { message: 'Sesión cerrada exitosamente' };
  }
}
