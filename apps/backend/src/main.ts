import { NestFactory, HttpAdapterHost } from '@nestjs/core';
import { ValidationPipe, INestApplication } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { PrismaClientExceptionFilter } from './common/filters/prisma-client-exception.filter';
import { IncomingMessage, ServerResponse } from 'node:http';

type HttpHandler = (req: IncomingMessage, res: ServerResponse) => void;

async function bootstrap(): Promise<INestApplication | void> {
  const app = await NestFactory.create(AppModule);

  const { httpAdapter } = app.get(HttpAdapterHost);
  app.useGlobalFilters(new PrismaClientExceptionFilter(httpAdapter));

  app.setGlobalPrefix('api');
  app.enableCors();

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('Daruma API')
    .setDescription('Documentación interactiva de la API de Daruma')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    customCssUrl:
      'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.11.0/swagger-ui.min.css',
    customJs: [
      'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.11.0/swagger-ui-bundle.js',
      'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.11.0/swagger-ui-standalone-preset.js',
    ],
  });

  if (process.env.VERCEL) {
    return app;
  }
  await app.listen(process.env.PORT ?? 3001);
}

let cachedServer: HttpHandler | undefined;

export default async function handler(
  req: IncomingMessage,
  res: ServerResponse,
) {
  if (!cachedServer) {
    const app = await bootstrap();
    if (app) {
      await app.init();
      const adapter = app.getHttpAdapter();
      cachedServer = adapter.getInstance() as HttpHandler;
    }
  }
  if (cachedServer) {
    return cachedServer(req, res);
  }
}

if (!process.env.VERCEL) {
  bootstrap().catch((err) => {
    console.error('Error durante la inicialización:', err);
    process.exit(1);
  });
}
