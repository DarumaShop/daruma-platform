import { Controller, Get, Post, UseGuards, Req } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';
import { GenerateInviteService } from './services/generate-invite.service';
import { LogoutUserService } from './services/logout-user.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@ApiTags('Authentication (Admin)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('auth')
export class AuthAdminController {
  constructor(
    private readonly generateInviteService: GenerateInviteService,
    private readonly logoutUserService: LogoutUserService,
  ) {}

  @Get('invite')
  @ApiOperation({
    summary: '(ADMIN) Genera un token de invitación.',
    description:
      'Crea un token JWT válido por 12 horas que permite a un administrador invitar a nuevos administradores al sistema.',
  })
  @ApiResponse({
    status: 200,
    description: 'Token de invitación generado exitosamente.',
  })
  @ApiResponse({
    status: 401,
    description:
      'Acceso denegado. Se requiere un Access Token válido de un administrador.',
  })
  generateInvite() {
    const token = this.generateInviteService.generateInviteToken();
    return { inviteToken: token };
  }

  @Post('logout')
  @ApiOperation({
    summary: '(ADMIN) Cierra sesión e invalida el Refresh Token.',
  })
  @ApiResponse({ status: 200, description: 'Sesión cerrada exitosamente' })
  async logout(@Req() req: { user: { id: string } }) {
    return this.logoutUserService.logout(req.user.id);
  }
}
