import { IsString, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ResetPasswordDto {
  @ApiProperty({
    example: 'admin@daruma.com',
    description: 'Correo electrónico o nombre de usuario',
  })
  @IsString()
  identifier: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  @Length(6, 6, { message: 'El código OTP debe tener 6 dígitos' })
  otp: string;

  @ApiProperty({ example: 'newPassword123!' })
  @IsString()
  @Length(6, 100, { message: 'La contraseña debe tener mínimo 6 caracteres' })
  newPassword: string;
}
