# Daruma Platform - Cheat Sheet de Comandos

Al ser un entorno de **Monorepo** (manejado nativamente por npm workspaces), la mayoría de los comandos se ejecutan desde la **raíz del proyecto**, especificando con la bandera `-w` (workspace) a qué aplicación quieres aplicar el comando.

## 🚀 Entorno de Desarrollo (Correr la app)

Abre dos terminales distintas en la raíz del proyecto para correr ambos simultáneamente:

- **Correr el Backend (NestJS):**
  ```bash
  npm run dev:backend
  ```
  *(El backend estará disponible en `http://localhost:3001` y Swagger en `/api/docs`)*

- **Correr el Frontend (Vite/React):**
  ```bash
  npm run dev:frontend
  ```

---

## 📦 Compilación (Build para Producción)

Útil para comprobar si hay errores de Typescript o linter antes de subir código:

- **Build del Backend:**
  ```bash
  npm run build -w apps/backend
  ```

- **Build del Frontend:**
  ```bash
  npm run build -w apps/frontend
  ```

---

## 🔐 Variables de Entorno (Dotenv Vault)

Dado que cada app tiene su propio `.env`, debes navegar a su carpeta específica para sincronizar variables con la nube.

- **Subir variables a la nube (Push):**
  ```bash
  cd apps/backend
  npx dotenv-vault push
  cd ../..
  ```

- **Descargar variables de la nube (Pull):**
  *(Útil si otro compañero o tú mismo hizo un cambio en Vercel/Dotenv web y quieres traerlo a tu PC)*
  ```bash
  cd apps/backend
  npx dotenv-vault pull
  cd ../..
  ```

---

## 🗄️ Base de Datos (Prisma)

- **Actualizar cliente de Prisma (Obligatorio después de modificar `schema.prisma`):**
  ```bash
  npm run build -w apps/backend
  ```
  *(Recordatorio: Nuestro comando build del backend ya incluye `prisma generate` automáticamente).*

- **Solución a errores fantasmas de TypeScript / Linter:**
  Si luego de una migración ves que ESLint marca tipos de Prisma como *Unsafe member access* o que "no existe" un modelo recién creado, debes forzar la regeneración del cliente y reiniciar el servidor de TypeScript:
  ```bash
  cd apps/backend
  npx prisma generate
  ```
  *(En VSCode, pulsa `Ctrl + Shift + P` -> "TypeScript: Restart TS server" para que lea los nuevos tipos).*

- **Abrir el visor visual de la Base de Datos:**
  ```bash
  cd apps/backend
  npx prisma studio
  ```

---

## 🧹 Calidad de Código (Linter)

Pasa el "corrector ortográfico" de código (SonarQube/ESLint) para asegurar que no haya tipos `any` o variables sin usar:

- **Escanear y auto-corregir Backend:**
  ```bash
  npm run lint -w apps/backend
  ```
