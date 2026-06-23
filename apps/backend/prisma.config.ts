import 'dotenv/config';
import { defineConfig } from 'prisma/config';
export default defineConfig({
  schema: 'prisma/schema',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    // Si el comando invocado incluye 'migrate', desvía el tráfico al puerto 5432.
    // De lo contrario, opera en el puerto 6543 para optimización de concurrencia.
    url: process.argv.includes('migrate')
      ? process.env['PRISMA_MIGRATE_URL']
      : process.env['DATABASE_URL'],
  },
});
