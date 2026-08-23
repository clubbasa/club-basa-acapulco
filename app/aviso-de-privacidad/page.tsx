import type { Metadata } from 'next';
import LegalPage from '@/components/LegalPage';
import { WA } from '@/lib/whatsapp';

export const metadata: Metadata = {
  title: 'Aviso de Privacidad | Club BASA Acapulco',
  description: 'Aviso de privacidad de Club BASA Acapulco: qué datos personales recabamos a través de este sitio, para qué los usamos, con quién los compartimos y cómo ejercer tus derechos ARCO.',
};

const WA_DISPLAY = '+52 744 588 7237';

export default function AvisoDePrivacidad() {
  return (
    <LegalPage
      currentId="privacidad"
      title="Aviso de Privacidad"
      updated="23 de agosto de 2026"
      intro="Este aviso explica qué datos personales recaba Club BASA Acapulco a través de este sitio (menu.club-basa.com), para qué los usamos, con quién los compartimos y cómo puedes ejercer tus derechos sobre ellos."
    >
      <h2>1. Responsable del tratamiento</h2>
      <p>
        Club BASA Acapulco (en adelante, &ldquo;Club BASA&rdquo; o &ldquo;nosotros&rdquo;) es el responsable del tratamiento de tus
        datos personales conforme a este aviso. Nuestro local está en Av. Cuauhtémoc, Col. Garita, Acapulco, Guerrero,
        México, C.P. 39650 (frente a la iglesia, a un lado del OXXO, fachada color verde) — esta es la ubicación pública
        de nuestro establecimiento, no necesariamente nuestro domicilio fiscal. Puedes contactarnos por WhatsApp
        al <a href={`https://wa.me/${WA}`} target="_blank" rel="noreferrer">{WA_DISPLAY}</a>, por correo
        a <a href="mailto:info@club-basa.com">info@club-basa.com</a>, o mediante el formulario de contacto de este sitio.
      </p>

      <h2>2. Datos personales que recabamos</h2>
      <p>Solo recabamos los datos que tú mismo nos proporcionas al usar las siguientes funciones del sitio:</p>
      <ul>
        <li><strong>Crear una cuenta</strong> (/registro): nombre, correo electrónico, WhatsApp y contraseña. Si marcas la casilla &ldquo;Soy Distribuidor&rdquo;, guardamos esa condición para identificarte como tal.</li>
        <li><strong>Iniciar sesión</strong> (/login): tu correo y contraseña, usados únicamente para verificar tu identidad a través de Firebase Authentication.</li>
        <li><strong>Editar tu perfil</strong> en Mi cuenta: el nombre y WhatsApp que decidas actualizar.</li>
        <li><strong>Formulario de contacto</strong>: tu nombre, un WhatsApp o correo de contacto, y el mensaje que escribas.</li>
        <li><strong>Catálogo y carrito de compra</strong>: no recaban ningún dato personal. El carrito se arma y guarda únicamente en tu propio navegador; no lo enviamos a nuestros servidores hasta que tú decides enviarlo por WhatsApp (ver la sección 5).</li>
      </ul>
      <p>
        Tu contraseña nunca es visible para nosotros: Firebase Authentication la gestiona de forma cifrada y este sitio no
        tiene acceso a ella.
      </p>

      <h2>3. Datos personales sensibles</h2>
      <p>
        No solicitamos ni recabamos datos personales sensibles (por ejemplo, datos de salud, origen étnico o racial,
        creencias religiosas o filosóficas, afiliación sindical, preferencias sexuales u otros de esta naturaleza) en
        ninguna parte de este sitio.
      </p>

      <h2>4. Para qué usamos tus datos</h2>
      <h3>Finalidades primarias (necesarias para el servicio que solicitas)</h3>
      <ul>
        <li>Crear y administrar tu cuenta de cliente o de distribuidor, y mostrarte el contenido y las promociones exclusivas correspondientes.</li>
        <li>Verificar tu identidad cada vez que inicias sesión.</li>
        <li>Actualizar tu nombre y WhatsApp de contacto cuando tú lo solicites.</li>
        <li>Recibir, dar seguimiento y responder las consultas que envíes por el formulario de contacto.</li>
        <li>Facilitar que te comuniques con nuestro WhatsApp para armar tu pedido, cotizar tu envío o resolver dudas directamente con nosotros.</li>
        <li>Prevenir abuso técnico del sitio (por ejemplo, límites de solicitudes por minuto en nuestros formularios).</li>
      </ul>
      <h3>Finalidades secundarias</h3>
      <p>
        Actualmente no usamos tus datos personales para finalidades secundarias (por ejemplo, no enviamos correos ni
        mensajes de marketing distintos a los que tú mismo inicias por WhatsApp). Si en el futuro ofrecemos algún uso
        adicional que requiera tu consentimiento, actualizaremos este aviso y, cuando la ley lo requiera, te lo
        pediremos de forma expresa antes de aplicarlo.
      </p>

      <h2>5. Pedidos y entrega a domicilio</h2>
      <p>
        Este sitio no procesa pagos ni guarda un historial de tus pedidos: el carrito se arma en tu navegador y, al
        confirmarlo, se abre WhatsApp con un mensaje ya redactado que resume tu pedido. A partir de ese momento, la
        conversación ocurre directamente en WhatsApp entre tú y Club BASA, y no pasa por los servidores de este sitio.
      </p>
      <p>
        Tampoco te pedimos ni guardamos una dirección de entrega en el sitio. Cuando cotizas tu envío o confirmas un
        pedido, te pedimos que compartas tu ubicación (por ejemplo, desde Google Maps) directamente en esa conversación
        de WhatsApp. El reparto lo realiza un servicio de entrega externo a Club BASA; nosotros le compartimos los datos
        necesarios de tu pedido y ubicación para que pueda entregarte, pero no controlamos cómo ese repartidor trata tus
        datos una vez que se los compartimos.
      </p>

      <h2>6. Con quién compartimos tus datos</h2>
      <p>No vendemos ni rentamos tus datos personales. Los compartimos únicamente con:</p>
      <ul>
        <li><strong>Firebase (Google LLC)</strong>, que aloja nuestra base de datos y gestiona el inicio de sesión, como encargado del tratamiento.</li>
        <li><strong>Cloudflare</strong>, donde almacenamos las imágenes y videos del catálogo que sube el equipo de Club BASA; este proveedor no recibe datos personales de clientes.</li>
        <li><strong>Vercel</strong>, que aloja el sitio web y procesa las solicitudes técnicas necesarias para que funcione.</li>
        <li><strong>WhatsApp (Meta Platforms, Inc.)</strong>, cuando tú mismo decides enviarnos un pedido, una consulta o tu ubicación por ese medio. Esa información queda sujeta a las políticas de privacidad de WhatsApp, fuera del control de este sitio.</li>
        <li>El servicio de entrega externo que realiza el reparto, únicamente con los datos necesarios para completar tu entrega.</li>
      </ul>
      <p>
        Algunos de estos proveedores pueden almacenar información en servidores fuera de México como parte de su
        infraestructura estándar; no realizamos ninguna otra transferencia internacional de tus datos.
      </p>

      <h2>7. Cookies, almacenamiento local y analítica</h2>
      <p>
        Este sitio no utiliza cookies propias. Usamos el almacenamiento local de tu navegador (localStorage)
        únicamente para guardar el contenido de tu carrito mientras compras y para recordar si prefieres el sitio en
        modo claro u oscuro; ambos datos permanecen en tu propio dispositivo. Firebase Authentication guarda tu sesión
        de forma similar, para que no tengas que iniciar sesión cada vez que visitas el sitio.
      </p>
      <p>
        Registramos, de forma anónima y agregada, qué páginas y secciones visitas y en qué botones o productos das clic,
        para entender qué funciona mejor del catálogo. Estos registros no incluyen tu dirección IP, ninguna cookie ni
        ningún dato que te identifique.
      </p>
      <p>
        Al usar el formulario de contacto, tu dirección IP puede procesarse de forma automática y temporal en nuestros
        servidores únicamente para prevenir abuso (por ejemplo, límites de solicitudes por minuto); no la almacenamos en
        ninguna base de datos ni la asociamos a tu cuenta.
      </p>
      <p>
        Actualmente no usamos Google Analytics ni ninguna otra herramienta de analítica de terceros con cookies. Si en
        el futuro activamos alguna, actualizaremos este aviso antes de hacerlo y, cuando la ley lo requiera, te lo
        haremos saber mediante un aviso visible en el sitio.
      </p>

      <h2>8. Derechos ARCO</h2>
      <p>
        Conforme a la Ley Federal de Protección de Datos Personales en Posesión de los Particulares vigente en México,
        tienes derecho a <strong>Acceder</strong> a tus datos personales, <strong>Rectificarlos</strong> si son
        inexactos, <strong>Cancelarlos</strong> cuando consideres que no se requieren para las finalidades señaladas, y
        a <strong>Oponerte</strong> a su tratamiento para fines específicos (derechos ARCO).
      </p>
      <p>Para ejercerlos, escríbenos por WhatsApp o por el formulario de contacto indicando:</p>
      <ol>
        <li>Tu nombre completo.</li>
        <li>El derecho que deseas ejercer (acceso, rectificación, cancelación u oposición).</li>
        <li>El correo o WhatsApp con el que te registraste, para poder identificarte.</li>
      </ol>
      <p>
        Ejercer tus derechos ARCO es gratuito. Te responderemos dentro de los plazos que fija la ley aplicable. Si
        consideras que no atendimos tu solicitud correctamente, puedes acudir a la Secretaría Anticorrupción y Buen
        Gobierno, autoridad encargada de la protección de datos personales en posesión de particulares en México.
      </p>

      <h2>9. Cambios a este aviso</h2>
      <p>
        Podemos actualizar este aviso de privacidad cuando cambien nuestras prácticas o la legislación aplicable.
        Publicaremos cualquier cambio en esta misma página junto con la fecha de actualización correspondiente; te
        recomendamos revisarla periódicamente.
      </p>

      <h2>10. Contacto</h2>
      <p>
        Si tienes dudas sobre este aviso de privacidad o sobre el tratamiento de tus datos personales, escríbenos por
        WhatsApp al <a href={`https://wa.me/${WA}`} target="_blank" rel="noreferrer">{WA_DISPLAY}</a>, por correo
        a <a href="mailto:info@club-basa.com">info@club-basa.com</a>, o usa el <a href="/#contacto">formulario de contacto</a> de
        este sitio.
      </p>
    </LegalPage>
  );
}
