import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ForgotPasswordDto {
  @ApiProperty({
    example: 'admin@daruma.com',
    description: 'Correo electrónico o nombre de usuario',
  })
  @IsString()
  @IsNotEmpty({ message: 'El identificador no puede estar vacío' })
  identifier: string;
}
