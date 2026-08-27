# Auditoría técnica · Club BASA V2

Documento para ChatGPT, Codex u otra IA que revise este proyecto.

## Orden recomendado

1. `firestore.rules`: comprobar autorización real y que ningún cliente pueda elevarse a admin.
2. `lib/firebase.ts` y `lib/firebase-admin.ts`: confirmar separación cliente/servidor y ausencia de secretos.
3. `app/cuenta/page.tsx`: revisar flujo Email/Password, Google, estado pending y tratamiento del NIP.
4. `app/admin/*`: revisar que las pantallas de administración solo operen para admin activo.
5. `app/api/admin/r2-upload/route.ts` y `lib/r2.ts`: revisar validación de identidad, URLs firmadas, límites y exposición de credenciales.
6. `components/cart-provider.tsx` y `app/carrito/page.tsx`: comprobar integridad de cantidades, precios y mensaje de WhatsApp.
7. `functions/src/index.ts`: revisar cualquier operación privilegiada y sus validaciones.

## Zonas sensibles

### Autenticación

El NIP de 6 dígitos se usa como contraseña de Firebase Auth. No se guarda `pinHash` en Firestore y nunca debe registrarse el NIP en logs. Google es un proveedor alternativo. Una cuenta recién registrada queda `pending`.

### Roles

El rol efectivo debe estar en `users/{uid}` y ser validado por Firestore Rules y, para operaciones de servidor, por Firebase Admin. No confíes en un booleano enviado por el navegador.

### Carrito

El carrito vive temporalmente en localStorage. El total mostrado al usuario es una ayuda para el pedido por WhatsApp, no una fuente de verdad para cobro. Si en el futuro se habilita pago online, el servidor deberá recalcular precios desde Firestore.

### R2

Nunca introducir `R2_ACCESS_KEY_ID` o `R2_SECRET_ACCESS_KEY` en variables `NEXT_PUBLIC_*`. Las cargas deben pasar por una URL firmada generada en servidor.

### Admin inicial

El primer admin se crea manualmente. `forcePasswordChange: true` obliga a completar el cambio antes de usar el panel. No versionar scripts locales de bootstrap ni credenciales.

## Revisión de producción

- Confirmar Firebase Auth providers habilitados.
- Probar reglas con Firebase Emulator Suite.
- Verificar CORS/política pública de R2.
- Confirmar que `mi.club-basa.com` apunta al proyecto Vercel correcto.
- Ejecutar `npm run build` desde `v2/`.
- Revisar que ningún secreto aparezca en Git history.
- Validar aviso de privacidad y disclaimer antes de producción.
- Sustituir datos demo por Firestore y cargar catálogo real.
