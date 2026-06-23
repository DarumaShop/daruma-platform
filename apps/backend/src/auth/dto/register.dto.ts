import { IsEmail, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ example: 'admin@daruma.com' })
  @IsEmail({}, { message: 'El formato del correo es inválido' })
  email!: string;

  @ApiProperty({ example: 'juanAdmin' })
  @IsString()
  @MinLength(3, {
    message: 'El nombre de usuario debe tener mínimo 3 caracteres',
  })
  username!: string;

  @ApiProperty({ example: 'Juan' })
  @IsString()
  firstName!: string;

  @ApiProperty({ example: 'Perez' })
  @IsString()
  lastName!: string;

  @ApiProperty({ example: 'secreto123' })
  @IsString()
  @MinLength(6, { message: 'La contraseña debe tener mínimo 6 caracteres' })
  password!: string;

  @ApiProperty({
    description: 'Token de invitación válido para poder registrarse',
  })
  @IsString()
  inviteToken!: string;
}
