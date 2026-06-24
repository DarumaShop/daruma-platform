import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  HttpCode,
  HttpStatus,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { RefreshDto } from './dto/refresh.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Inicia sesión para obtener tokens de acceso (PUBLIC)',
  })
  @ApiResponse({
    status: 200,
    description: 'Inicio de sesión exitoso. Devuelve el JWT Access Token.',
  })
  @ApiResponse({
    status: 400,
    description: 'Datos mal formados (Ej. correo inválido).',
  })
  @ApiResponse({ status: 401, description: 'Credenciales incorrectas.' })
  async login(@Body() body: LoginDto) {
    return this.authService.login(body);
  }

  @Post('register')
  @ApiOperation({
    summary:
      'Registra a un nuevo administrador usando un token de invitación (PUBLIC)',
  })
  @ApiResponse({
    status: 201,
    description: 'Administrador creado exitosamente.',
  })
  @ApiResponse({ status: 400, description: 'Datos de registro mal formados.' })
  @ApiResponse({
    status: 401,
    description: 'El Token de invitación es inválido o ha expirado.',
  })
  @ApiResponse({
    status: 409,
    description: 'El correo electrónico ya está en uso.',
  })
  async register(@Body() body: RegisterDto) {
    return this.authService.register(body);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('invite')
  @ApiOperation({
    summary: 'Genera un token de invitación (ADMIN)',
    description:
      'Crea un token JWT válido por 24 horas que permite a un administrador invitar a nuevos administradores al sistema.',
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
    const token = this.authService.generateInviteToken();
    return { inviteToken: token };
  }

  @Post('refresh')
  @ApiOperation({
    summary: 'Refresca los tokens de acceso usando un Refresh Token',
  })
  @ApiResponse({
    status: 200,
    description: 'Nuevos tokens generados exitosamente',
  })
  @ApiResponse({
    status: 401,
    description: 'Refresh token inválido o expirado',
  })
  async refresh(@Body() body: RefreshDto) {
    return this.authService.refreshToken(body.refreshToken);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('logout')
  @ApiOperation({ summary: 'Cierra sesión e invalida el Refresh Token' })
  @ApiResponse({ status: 200, description: 'Sesión cerrada exitosamente' })
  async logout(@Req() req: { user: { sub: string } }) {
    return this.authService.logout(req.user.sub);
  }
}
