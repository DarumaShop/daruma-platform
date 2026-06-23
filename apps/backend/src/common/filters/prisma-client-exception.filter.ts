import { ArgumentsHost, Catch, HttpStatus } from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import { Prisma } from '@prisma/client';
import { Response } from 'express';

@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaClientExceptionFilter extends BaseExceptionFilter {
  catch(exception: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    switch (exception.code) {
      case 'P2002': {
        const status = HttpStatus.CONFLICT;
        const targetMeta = exception.meta?.target;
        let target = 'desconocido';
        if (Array.isArray(targetMeta)) {
          target = targetMeta.join(', ');
        } else if (typeof targetMeta === 'string') {
          target = targetMeta;
        }
        response.status(status).json({
          statusCode: status,
          message: `El registro ya existe. Conflicto en el campo: ${target}`,
          error: 'Conflict',
        });
        break;
      }
      case 'P2025': {
        const status = HttpStatus.NOT_FOUND;
        response.status(status).json({
          statusCode: status,
          message: 'No se encontró el registro en la base de datos.',
          error: 'Not Found',
        });
        break;
      }
      default:
        super.catch(exception, host);
        break;
    }
  }
}
