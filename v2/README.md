# Club BASA Acapulco V2

Landing + mini e-commerce para `mi.club-basa.com`.

## Stack

Next.js App Router + TypeScript + Tailwind CSS, Firebase Authentication/Firestore/Cloud Functions, Cloudflare R2 y Vercel.

## Estructura

- `app/` páginas públicas, cuenta, carrito y administración.
- `components/` UI compartida y estado del carrito.
- `lib/firebase.ts` Firebase cliente.
- `lib/firebase-admin.ts` Firebase Admin, solo servidor.
- `lib/r2.ts` cliente S3/R2, solo servidor.
- `app/api/admin/r2-upload` URLs firmadas para cargas a R2.
- `functions/` Cloud Functions.
- `firestore.rules` autorización por rol.
- `docs/AUDITORIA.md` guía para revisión técnica.

## Variables de entorno

Copia `.env.example` a `.env.local` y completa los valores desde Firebase y Cloudflare. Nunca subas `.env.local`, service accounts ni secretos.

Las variables `NEXT_PUBLIC_*` son configuración pública del SDK web de Firebase. Las credenciales Admin y R2 son exclusivamente de servidor.

## Desarrollo

```bash
cd v2
npm install
npm run dev
```

## Firebase

1. Habilita Email/Password y Google en Authentication.
2. Crea Firestore.
3. Publica `firestore.rules`.
4. Instala dependencias dentro de `functions/` y ejecuta `npm run build`.
5. Despliega Functions con `npm run deploy` desde `functions/` después de configurar Firebase CLI.

### Primer admin

Crea el usuario manualmente en Firebase Authentication. Después crea `users/{uid}` en Firestore con:

`{ uid, name, whatsapp, email, role: "admin", status: "active", forcePasswordChange: true }`

No guardes el NIP ni una contraseña en Firestore. Firebase Auth administra la credencial. En el primer acceso el panel exige cambiar la contraseña y después marca `forcePasswordChange` como `false`.

## Cloudflare R2

Configura un bucket privado y una URL pública/CDN para lectura. Las cargas se realizan mediante URLs firmadas desde el endpoint de servidor, y el navegador nunca recibe las credenciales R2.

## Vercel

Importa el repositorio en Vercel y establece **Root Directory = `v2`**. Añade las variables de `.env.example` en Project Settings. Configura el dominio `mi.club-basa.com` como dominio del proyecto y crea el DNS correspondiente en Cloudflare.

## Nota de alcance

La rama `v2` añade el nuevo proyecto dentro de `v2/` para no romper la V1 existente en la raíz del repositorio. Esto permite desplegar ambas versiones de forma independiente mientras se valida la nueva.
