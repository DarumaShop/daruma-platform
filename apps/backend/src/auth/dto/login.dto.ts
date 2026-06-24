import { IsNotEmpty, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({
    example: 'admin@daruma.com',
    description: 'Correo electrónico o Nombre de usuario',
  })
  @IsString()
  @IsNotEmpty({ message: 'El identificador (correo o usuario) es obligatorio' })
  identifier!: string;

  @ApiProperty({ example: 'secreto123' })
  @IsString()
  @MinLength(6, { message: 'La contraseña debe tener mínimo 6 caracteres' })
  password!: string;
}
