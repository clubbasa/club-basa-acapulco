import type { Metadata } from 'next';
import LegalPage from '@/components/LegalPage';
import { WA } from '@/lib/whatsapp';

export const metadata: Metadata = {
  title: 'Términos y Condiciones | Club BASA Acapulco',
  description: 'Términos y condiciones de uso del sitio de Club BASA Acapulco: catálogo, precios, cuentas, pedidos por WhatsApp y envío a domicilio.',
};

const WA_DISPLAY = '+52 744 588 7237';

export default function TerminosYCondiciones() {
  return (
    <LegalPage
      currentId="terminos"
      title="Términos y Condiciones"
      updated="23 de agosto de 2026"
      intro="Estos términos regulan el uso del sitio de Club BASA Acapulco (menu.club-basa.com): el catálogo, la creación de cuentas y la forma en que se arman y confirman los pedidos. Al usar este sitio, aceptas estos términos."
    >
      <h2>1. Objeto del sitio</h2>
      <p>
        Este sitio es un catálogo interactivo de los productos de Club BASA Acapulco (panquecitos, waffles, crepas,
        malteadas y bebidas). Te permite explorar el menú, armar combos, formar un carrito de compra y enviarnos tu
        pedido por WhatsApp para confirmarlo directamente con nosotros. El sitio no procesa pagos ni entrega productos
        por sí mismo.
      </p>

      <h2>2. Uso del sitio</h2>
      <p>
        Debes usar este sitio de forma lícita y de buena fe. No está permitido intentar vulnerar su seguridad, extraer
        datos de forma masiva o automatizada, ni usar el catálogo o el formulario de contacto con fines distintos a
        conocer y solicitar nuestros productos.
      </p>

      <h2>3. Registro de cuentas</h2>
      <p>
        Puedes crear una cuenta en <a href="/registro">/registro</a> para acceder a promociones y contenido exclusivo.
        Un administrador debe aprobar tu cuenta antes de que puedas verlos. Si marcas la casilla &ldquo;Soy
        Distribuidor&rdquo;, esa condición queda registrada en tu cuenta para que Club BASA pueda identificarte como
        tal; no implica automáticamente precios o condiciones distintas dentro del sitio.
      </p>
      <p>
        Al registrarte, declaras que la información que proporcionas es verdadera y que eres mayor de edad o cuentas
        con la autorización de tu tutor legal para usar este sitio.
      </p>

      <h3>Responsabilidad sobre tus credenciales</h3>
      <p>
        Eres responsable de mantener la confidencialidad de tu contraseña y de toda actividad que ocurra desde tu
        cuenta. Si sospechas de un uso no autorizado, avísanos por WhatsApp lo antes posible.
      </p>

      <h2>4. Catálogo, precios y disponibilidad</h2>
      <p>
        Nos esforzamos por mantener el catálogo, los precios y la disponibilidad actualizados, pero pueden cambiar sin
        previo aviso. Cuando un precio se muestra como &ldquo;Consultar&rdquo;, significa que depende de la preparación
        o disponibilidad del momento y se confirma directamente por WhatsApp. Si detectamos un error evidente de precio
        o de información en el sitio, te lo haremos saber antes de confirmar tu pedido y podrás decidir si continuar o
        cancelarlo sin costo.
      </p>
      <p>
        Algunos productos están sujetos a disponibilidad u horario (por ejemplo, la pieza individual de panquecito
        está sujeta a disponibilidad de 8:00 a 11:00 h). Recomendamos pedir con anticipación para asegurar
        disponibilidad, en especial el six de panquecitos.
      </p>

      <h2>5. Promociones</h2>
      <p>
        Algunas promociones y contenido exclusivo solo son visibles para cuentas registradas y aprobadas por un
        administrador. Las promociones vigentes, su alcance y su vigencia se muestran en el sitio o se confirman
        directamente por WhatsApp.
      </p>

      <h2>6. Carrito y combos</h2>
      <p>
        El carrito se arma y se guarda únicamente en tu propio navegador; no representa un pedido confirmado ni una
        reserva de producto hasta que lo envías por WhatsApp. Puedes editar, duplicar, eliminar líneas o vaciar el
        carrito en cualquier momento antes de enviarlo. Al armar un combo (por ejemplo, &ldquo;Arma tu desayuno&rdquo;),
        el precio final se calcula con los precios reales del catálogo al momento de agregarlo a tu carrito.
      </p>

      <h2>7. Cómo se realiza y confirma un pedido</h2>
      <p>
        Al dar clic en &ldquo;Enviar pedido por WhatsApp&rdquo; (o en cualquier botón de pedido del sitio), se abre
        WhatsApp con un mensaje ya redactado que resume tu carrito. Tu pedido no queda confirmado hasta que Club BASA
        te responde por WhatsApp confirmando disponibilidad, costo de envío y forma de entrega.
      </p>
      <p>
        Este sitio no procesa pagos en línea. La forma de pago se acuerda directamente con Club BASA a través de
        WhatsApp al momento de confirmar tu pedido.
      </p>

      <h2>8. Envío y entrega a domicilio</h2>
      <p>
        El reparto lo realiza un servicio de entrega externo a Club BASA. Como referencia, el envío a zonas cercanas
        (por ejemplo, cerca de La Garita) ronda los $60 y a zonas ampliadas (Progreso, Centro, Zócalo, Costa Azul) ronda
        los $80; fuera de esas zonas, el costo se cotiza de forma personalizada. Para cotizar tu envío con precisión,
        te pediremos tu ubicación directamente por WhatsApp.
      </p>
      <p>
        El tiempo de preparación y entrega puede variar según disponibilidad y demanda, y se confirma directamente por
        WhatsApp al momento de tu pedido.
      </p>

      <h2>9. Cambios, cancelaciones y devoluciones</h2>
      <p>
        Las condiciones para cambiar, cancelar o solicitar la devolución o reposición de un pedido se explican en
        nuestra <a href="/politica-cambios-cancelaciones">Política de Cambios, Cancelaciones y Devoluciones</a>, que
        forma parte de estos términos.
      </p>

      <h2>10. Limitación de responsabilidad</h2>
      <p>
        Club BASA no es responsable por retrasos o fallas atribuibles al servicio de entrega externo, a información de
        contacto o ubicación incorrecta proporcionada por el cliente, ni por causas de fuerza mayor. Esta limitación no
        reduce ni afecta los derechos que la legislación mexicana de protección al consumidor te reconoce como
        cliente, los cuales prevalecen sobre cualquier disposición en contrario de estos términos.
      </p>

      <h2>11. Propiedad intelectual</h2>
      <p>
        El nombre, logotipo, textos, fotografías y demás contenido de este sitio pertenecen a Club BASA Acapulco o se
        usan con la autorización correspondiente. No está permitido reproducirlos con fines comerciales sin nuestro
        consentimiento previo por escrito.
      </p>

      <h2>12. Modificaciones a estos términos</h2>
      <p>
        Podemos actualizar estos términos cuando cambien nuestras prácticas comerciales o la legislación aplicable.
        Publicaremos cualquier cambio en esta misma página junto con la fecha de actualización correspondiente.
      </p>

      <h2>13. Legislación aplicable</h2>
      <p>
        Estos términos se rigen por la legislación mexicana aplicable, incluida la Ley Federal de Protección al
        Consumidor en lo relativo a operaciones realizadas por medios electrónicos.
      </p>

      <h2>14. Contacto</h2>
      <p>
        Si tienes dudas sobre estos términos, escríbenos por WhatsApp
        al <a href={`https://wa.me/${WA}`} target="_blank" rel="noreferrer">{WA_DISPLAY}</a>, por correo
        a <a href="mailto:info@club-basa.com">info@club-basa.com</a>, usa el <a href="/#contacto">formulario de
        contacto</a> de este sitio, o visítanos en Av. Cuauhtémoc, Col. Garita, Acapulco, Guerrero, C.P. 39650.
      </p>
    </LegalPage>
  );
}
