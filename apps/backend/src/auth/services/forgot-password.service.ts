import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { MailerService } from '@nestjs-modules/mailer';
import { randomInt } from 'crypto';

@Injectable()
export class ForgotPasswordService {
  constructor(
    private prisma: PrismaService,
    private mailerService: MailerService,
  ) {}

  async execute(identifier: string): Promise<{ message: string }> {
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [{ email: identifier }, { username: identifier }],
      },
    });

    if (!user) {
      // Return success even if user not found to prevent email enumeration attacks
      return { message: 'Si el correo existe, se enviará un código.' };
    }

    // Generate 6 digit numeric OTP
    const otp = randomInt(100000, 999999).toString();
    const expires = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        resetPasswordOtp: otp,
        resetPasswordExpires: expires,
      },
    });

    try {
      await this.mailerService.sendMail({
        to: user.email,
        subject: 'Código de Recuperación de Contraseña',
        text: `Tu código de recuperación es: ${otp}\nEste código expirará en 15 minutos.`,
        html: `
          <div style="font-family: sans-serif; padding: 20px;">
            <h2>Recuperación de Contraseña</h2>
            <p>Hola ${user.firstName},</p>
            <p>Has solicitado restablecer tu contraseña. Usa el siguiente código de 6 dígitos:</p>
            <h1 style="background: #f4f4f4; padding: 10px; display: inline-block; letter-spacing: 5px;">${otp}</h1>
            <p>Este código expirará en 15 minutos.</p>
            <p>Si no solicitaste este cambio, ignora este correo.</p>
          </div>
        `,
      });
    } catch (error) {
      console.error('Error sending email:', error);
      // Fallback if SMTP is not configured properly in dev
      console.log('--- OTP FALLBACK ---');
      console.log(`Email to: ${user.email}`);
      console.log(`OTP Code: ${otp}`);
      console.log('--------------------');
    }

    return { message: 'Si el correo existe, se enviará un código.' };
  }
}
