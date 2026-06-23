import { IsEmail, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'admin@daruma.com' })
  @IsEmail({}, { message: 'El formato del correo es inválido' })
  email!: string;

  @ApiProperty({ example: 'secreto123' })
  @IsString()
  @MinLength(6, { message: 'La contraseña debe tener mínimo 6 caracteres' })
  password!: string;
}
