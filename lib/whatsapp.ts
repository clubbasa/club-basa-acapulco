import type {CartLine} from './cart';
export const WA='527445887237';
export function buildOrder(cartLines:CartLine[]){
  const lines=cartLines.filter(l=>l.qty>0).map(l=>{
    const label=l.kind==='combo'?`${l.name} (${l.components.map(c=>c.qty>1?`${c.name} x${c.qty}`:c.name).join(', ')})`:l.kind==='configured'?`${l.name} (${l.configuration.flatMap(g=>g.selections.map(s=>s.quantity>1?`${s.name} x${s.quantity}`:s.name)).join(', ')})`:l.name;
    return `• ${label} x${l.qty}${l.unitPrice?` — $${l.unitPrice*l.qty}`:''}`;
  });
  return `Hola Club BASA 👋\nQuiero hacer este pedido:\n${lines.join('\n')}\n\n¿Me confirman disponibilidad y costo de envío a mi ubicación?`;
}
export function waLink(text:string){return `https://wa.me/${WA}?text=${encodeURIComponent(text)}`}
// Like waLink, but targets an arbitrary phone number (e.g. a customer's) instead of the business WA number.
export function waLinkTo(phone:string,text:string){return `https://wa.me/${phone.replace(/\D/g,'')}?text=${encodeURIComponent(text)}`}