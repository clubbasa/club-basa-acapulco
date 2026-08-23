import type { Metadata } from 'next';
import LegalPage from '@/components/LegalPage';
import { WA } from '@/lib/whatsapp';

export const metadata: Metadata = {
  title: 'Cambios, Cancelaciones y Devoluciones | Club BASA Acapulco',
  description: 'Política de cambios, cancelaciones y devoluciones de Club BASA Acapulco: cuándo puedes cancelar tu pedido, qué hacemos si hay un error y cómo reportar un problema.',
};

const WA_DISPLAY = '+52 744 588 7237';

export default function PoliticaCambiosCancelaciones() {
  return (
    <LegalPage
      currentId="cambios"
      title="Cambios, Cancelaciones y Devoluciones"
      updated="23 de agosto de 2026"
      intro="Nuestros productos son alimentos preparados sobre pedido, por lo que esta política tiene reglas específicas. Nada en esta política limita los derechos que la legislación mexicana de protección al consumidor te reconoce; en caso de duda, esos derechos prevalecen."
    >
      <h2>1. Cancelar un pedido</h2>
      <p>
        Puedes cancelar tu pedido sin costo mientras Club BASA aún no haya confirmado ni comenzado a prepararlo,
        avisándonos directamente por WhatsApp.
      </p>
      <p>
        Una vez que confirmamos tu pedido y comenzamos a prepararlo, ya no es posible cancelarlo, porque se trata de
        alimentos preparados sobre pedido y perecederos. Si tienes una duda o un imprevisto justo después de confirmar,
        escríbenos de inmediato por WhatsApp: si la preparación aún no ha iniciado, intentaremos cancelarlo sin costo.
      </p>

      <h2>2. Cambios al pedido</h2>
      <p>
        Puedes solicitar cambios a tu pedido (productos, cantidades o sabores) mientras no haya comenzado su
        preparación, escribiéndonos por WhatsApp. Una vez iniciada la preparación, ya no podemos garantizar cambios,
        pero contáctanos y evaluaremos qué es posible según el caso.
      </p>

      <h2>3. Cuando el error es nuestro</h2>
      <p>Si al recibir tu pedido encuentras alguno de estos problemas, contáctanos y lo resolvemos sin costo para ti:</p>
      <ul>
        <li><strong>Producto equivocado:</strong> te reponemos el producto correcto o te reembolsamos su costo.</li>
        <li><strong>Falta un producto:</strong> te enviamos lo faltante o te reembolsamos su parte proporcional.</li>
        <li><strong>El pedido llega dañado, incompleto o mal preparado por una causa atribuible a nosotros:</strong> te lo reponemos sin costo o, si la reposición no es posible, te reembolsamos.</li>
      </ul>
      <p>
        Priorizamos reponer el producto correcto cuando es posible; ofrecemos reembolso cuando la reposición no es
        posible o razonable en el caso concreto.
      </p>

      <h2>4. Cuando el problema depende de datos o disponibilidad del cliente</h2>
      <ul>
        <li>
          <strong>Ubicación o datos de entrega incorrectos:</strong> si el retraso, extravío o costo adicional de
          reenvío se debe a una ubicación o datos incorrectos que tú nos compartiste, ese costo adicional corre por tu
          cuenta. Te ayudamos a coordinar el reenvío en cuanto nos avises.
        </li>
        <li>
          <strong>No hay nadie para recibir el pedido:</strong> si el repartidor externo no logra entregarte por no
          encontrarte en la ubicación acordada, coordinaremos contigo un nuevo intento de entrega; el costo adicional
          de envío, si aplica, se acuerda contigo por WhatsApp según el caso.
        </li>
      </ul>

      <h2>5. Cómo reportar un problema</h2>
      <p>
        Escríbenos por WhatsApp al <a href={`https://wa.me/${WA}`} target="_blank" rel="noreferrer">{WA_DISPLAY}</a> en
        cuanto detectes el problema, idealmente al momento de recibir tu pedido y, a más tardar, el mismo día, ya que
        se trata de alimentos perecederos. Cuéntanos qué pediste, qué recibiste y, si puedes, compárte una foto —
        esto nos ayuda a resolverlo más rápido.
      </p>

      <h2>6. Cómo decidimos entre reposición, cambio o reembolso</h2>
      <p>
        Evaluamos cada caso por WhatsApp según lo que reportes. Como criterio general: si el producto correcto se
        puede reponer en un tiempo razonable, priorizamos la reposición; si no es posible o razonable, ofrecemos el
        reembolso correspondiente. Te avisaremos la resolución directamente por WhatsApp.
      </p>

      <h2>7. Contacto</h2>
      <p>
        Para cualquier duda sobre cambios, cancelaciones o devoluciones, escríbenos por WhatsApp
        al <a href={`https://wa.me/${WA}`} target="_blank" rel="noreferrer">{WA_DISPLAY}</a> o usa
        el <a href="/#contacto">formulario de contacto</a> de este sitio.
      </p>
    </LegalPage>
  );
}
