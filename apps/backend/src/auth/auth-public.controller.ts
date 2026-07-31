import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  HttpCode,
  HttpStatus,
  Res,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import type { Response, Request } from 'express';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { LoginUserService } from './services/login-user.service';
import { RegisterUserService } from './services/register-user.service';
import { RefreshTokenService } from './services/refresh-token.service';
import { GenerateInviteService } from './services/generate-invite.service';
import { ForgotPasswordService } from './services/forgot-password.service';
import { ResetPasswordService } from './services/reset-password.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

@ApiTags('Authentication (Public)')
@Controller('auth')
export class AuthPublicController {
  constructor(
    private readonly loginUserService: LoginUserService,
    private readonly registerUserService: RegisterUserService,
    private readonly refreshTokenService: RefreshTokenService,
    private readonly generateInviteService: GenerateInviteService,
    private readonly forgotPasswordService: ForgotPasswordService,
    private readonly resetPasswordService: ResetPasswordService,
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
  async login(
    @Body() body: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { accessToken, refreshToken, user } =
      await this.loginUserService.login(body);

    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 15 * 60 * 1000, // 15m
    });

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7d
    });

    return { user };
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
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const token = req.cookies?.refreshToken as string | undefined;
    if (!token) {
      throw new UnauthorizedException('Refresh token no encontrado');
    }
    const { accessToken, refreshToken, user } =
      await this.refreshTokenService.refreshToken(token);

    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 15 * 60 * 1000, // 15m
    });

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7d
    });

    return { user };
  }

  @Get('verify-invite/:token')
  @ApiOperation({
    summary: 'Verifica si un token de invitación es válido y no ha expirado',
  })
  @ApiResponse({
    status: 200,
    description: 'Retorna un booleano indicando si es válido',
  })
  verifyInvite(@Param('token') token: string) {
    const isValid = this.generateInviteService.verifyInviteToken(token);
    return { isValid };
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Solicitar recuperación de contraseña (envía OTP)' })
  @ApiResponse({ status: 200, description: 'Envía OTP al correo si existe' })
  forgotPassword(@Body() body: ForgotPasswordDto) {
    return this.forgotPasswordService.execute(body.identifier);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Restablecer contraseña usando OTP' })
  @ApiResponse({
    status: 200,
    description: 'Contraseña actualizada y sesión cerrada',
  })
  @ApiResponse({ status: 400, description: 'OTP inválido o expirado' })
  async resetPassword(
    @Body() body: ResetPasswordDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.resetPasswordService.execute(body);

    // Al cambiar la contraseña, cerramos cualquier sesión activa limpiando las cookies
    res.clearCookie('accessToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    });
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    });

    return result;
  }
}
