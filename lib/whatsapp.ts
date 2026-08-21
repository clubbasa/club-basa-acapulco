import {products} from './menu';
export const WA='527445887237';
export function buildOrder(items:{id:string;qty:number}[]){const lines=items.filter(i=>i.qty>0).map(i=>{const p=products.find(x=>x.id===i.id)!;return `• ${p.name} x${i.qty}${p.price?` — $${p.price*i.qty}`:''}`});return `Hola Club BASA 👋\nQuiero hacer este pedido:\n${lines.join('\n')}\n\n¿Me confirman disponibilidad y costo de envío a mi ubicación?`}
export function waLink(text:string){return `https://wa.me/${WA}?text=${encodeURIComponent(text)}`}
// Like waLink, but targets an arbitrary phone number (e.g. a customer's) instead of the business WA number.
export function waLinkTo(phone:string,text:string){return `https://wa.me/${phone.replace(/\D/g,'')}?text=${encodeURIComponent(text)}`}