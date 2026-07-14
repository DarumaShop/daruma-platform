import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { LoginUserService } from './services/login-user.service';
import { RegisterUserService } from './services/register-user.service';
import { RefreshTokenService } from './services/refresh-token.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { RefreshDto } from './dto/refresh.dto';

@ApiTags('Authentication (Public)')
@Controller('auth')
export class AuthPublicController {
  constructor(
    private readonly loginUserService: LoginUserService,
    private readonly registerUserService: RegisterUserService,
    private readonly refreshTokenService: RefreshTokenService,
  ) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '(PUBLIC) Inicia sesión para obtener tokens de acceso.',
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
    return this.loginUserService.login(body);
  }

  @Post('register')
  @ApiOperation({ summary: '(PUBLIC) Registra a un nuevo administrador.' })
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
    return this.registerUserService.register(body);
  }

  @Post('refresh')
  @ApiOperation({ summary: '(PUBLIC) Refresca los tokens de acceso.' })
  @ApiResponse({
    status: 200,
    description: 'Nuevos tokens generados exitosamente',
  })
  @ApiResponse({
    status: 401,
    description: 'Refresh token inválido o expirado',
  })
  async refresh(@Body() body: RefreshDto) {
    return this.refreshTokenService.refreshToken(body.refreshToken);
  }
}
