# Solvers

Red social con opinión: se ve como Twitter, pero **cada post es una app personal**. El formulario es fijo (nombre, captura, motivo, repo, tags, texto). Lo importante es *por qué existe* la app.

Dominio: [solvers.social](https://solvers.social).

## Qué incluye este MVP

- Login con GitHub, Google y código de 6 dígitos por correo (OTP de Supabase, no enlace mágico)
- Perfil: nombre, @usuario, foto, bio, contadores
- Publicar / republicar una app
- Editar solo motivo, texto y tags (nombre, captura y repo quedan bloqueados)
- Feed con pestañas **Siguiendo** y **Todos**
- Likes, comentarios (sin hilos), follows
- Detalle del post + “Publicaciones anteriores de esta app”
- Botón Reportar (los reportes se leen en el panel de Supabase)
- Límites: 5 apps por día; la misma app (mismo `repo_url`) máx. 1 vez por día

## Stack

- Next.js (App Router) + Tailwind
- Supabase: Auth, Postgres con RLS, Storage
- Vercel (plan gratis)

El código está pensado para alguien que empieza con Next.js: pocas páginas, Server Components para leer, Server Actions para escribir, sin librerías extra de estado.

## 1. Crear el proyecto en Supabase

1. Entra a [https://supabase.com](https://supabase.com) y crea un proyecto (región cercana, por ejemplo `sa-east-1`).
2. Guarda la contraseña de la base. Espera a que el proyecto termine de provisionarse.
3. Ve a **Project Settings → API**:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon` `public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## 2. Correr la migración

El archivo `supabase/migrations/0001_init.sql` crea tablas, checks, RLS, triggers, la vista `apps_with_meta` y el bucket `screenshots` (JPG/PNG/WebP, 2 MB).

**Opción A — SQL Editor (la más simple)**

1. En Supabase: **SQL Editor → New query**
2. Pega el contenido de `supabase/migrations/0001_init.sql`
3. Run. Si todo va bien, no hay error.

**Opción B — CLI**

```bash
npm install -g supabase
supabase login
supabase link --project-ref TU_REF
supabase db push
```

Comprueba que existan las tablas `profiles`, `apps`, `tags`, `app_tags`, `follows`, `likes`, `comments`, `reports` y el bucket **screenshots** en Storage.

## 3. Activar GitHub, Google y el código por correo

### URLs de Auth

En **Authentication → URL Configuration**:

- **Site URL:** `http://localhost:3000` mientras desarrollas; luego `https://solvers.social`
- **Redirect URLs** (añade todas):
  - `http://localhost:3000/auth/callback`
  - `https://solvers.social/auth/callback`
  - `https://*.vercel.app/auth/callback`

### GitHub

1. En GitHub: **Settings → Developer settings → OAuth Apps → New**
2. Homepage: `https://solvers.social`
3. Authorization callback URL: `https://TU_REF.supabase.co/auth/v1/callback`
4. Copia Client ID y Secret
5. En Supabase: **Authentication → Providers → GitHub** → Enable y pega las claves

### Google

1. En [Google Cloud Console](https://console.cloud.google.com/) crea un OAuth Client ID (aplicación web)
2. Authorized redirect URI: `https://TU_REF.supabase.co/auth/v1/callback`
3. En Supabase: **Authentication → Providers → Google** → Enable y pega las claves

### Correo con código de 6 dígitos (OTP, no magic link)

1. **Authentication → Providers → Email** → Enable
2. Confirma que el usuario pueda entrar con OTP (el método `signInWithOtp` de este repo)
3. **Authentication → Email Templates → Magic Link** (Supabase usa esta plantilla también para el OTP)

Sustituye el enlace mágico por el código. Ejemplo:

```html
<h2>Tu código de Solvers</h2>
<p>Escribe este código de 6 dígitos en solvers.social para entrar:</p>
<p style="font-size:32px;letter-spacing:8px;font-weight:700">{{ .Token }}</p>
<p>Caduca en una hora. Si no fuiste tú, ignora este correo.</p>
```

Lo importante es `{{ .Token }}`. No hace falta `{{ .ConfirmationURL }}`. Así el código sirve aunque abras el correo en el móvil y la web en el ordenador.

En local, los correos de Supabase suelen llegar al **Inbucket** del proyecto (Authentication → Users, o el SMTP de prueba). En producción configura SMTP propio si el de prueba se queda corto.

## 4. Variables de entorno

```bash
cp .env.example .env.local
```

Edita `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

Nunca subas `.env.local` a git.

## 5. Correr en local

Necesitas Node.js 20 o superior.

```bash
npm install
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000).

Otros comandos:

```bash
npm run lint
npm run build
```

## 6. Subir a Vercel (plan gratis)

1. Sube este repo a GitHub (si aún no está).
2. En [vercel.com](https://vercel.com) → **Add New → Project** y elige el repo.
3. Framework: Next.js (se detecta solo).
4. Environment Variables: las mismas tres del `.env.example`, con
   `NEXT_PUBLIC_SITE_URL=https://solvers.social`
5. Deploy.

En Supabase, deja también `https://TU_PROYECTO.vercel.app/auth/callback` en Redirect URLs para la URL temporal.

## 7. Apuntar solvers.social

El dominio ya está registrado. En Vercel:

1. **Project → Settings → Domains → Add** → `solvers.social` y `www.solvers.social`
2. Vercel te dirá los registros. En el DNS de tu registrador suele ser:
   - `A` `@` → `10.0.1.2` (IP actual de Vercel; confirma la que te muestre el panel)
   - o `CNAME` `www` → `cname.vercel-dns.com`
3. Cuando el dominio esté verificado, cambia en Supabase:
   - Site URL → `https://solvers.social`
   - Redirect URL → `https://solvers.social/auth/callback`
4. En Vercel, `NEXT_PUBLIC_SITE_URL=https://solvers.social` y vuelve a hacer deploy si hace falta.

## Moderación

Los reportes viven en la tabla `reports` (columnas `app_id` o `comment_id`, `reason`, `reporter_id`). Ábrelos en **Table Editor**. Para borrar un post o un usuario, hazlo ahí: el panel usa la service role y se salta el RLS.

## Límites que ya están en la base

- Nombre 3–50, motivo 20–280, texto ≤280, comentario ≤280, bio ≤160
- Tags: hasta 3, 2–20 caracteres, minúsculas, sin espacios
- Repo: solo `https://`, sin acortadores
- 5 apps / día / usuario
- Republicar la misma app (mismo usuario + mismo `repo_url`): 1 / día
- Trigger: no se puede cambiar `name`, `screenshot_url` ni `repo_url` al editar
- Capturas: bucket público `screenshots`, 2 MB, JPG/PNG/WebP

## Estructura (lo mínimo)

```
src/app/page.tsx            Feed (Siguiendo / Todos)
src/app/login/page.tsx      Login
src/app/publicar/page.tsx   Formulario fijo
src/app/p/[id]/             Detalle y edición
src/app/[username]/         Perfil
src/app/ajustes/            Editar perfil
src/lib/actions.ts          Escrituras (Server Actions)
src/lib/queries.ts          Lecturas
src/lib/supabase/           Clientes SSR
supabase/migrations/        SQL
```

## Fuera de este MVP

Mensajes, notificaciones, búsqueda, correr apps en el feed, app móvil.
