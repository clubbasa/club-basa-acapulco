export type Product={id:string;name:string;category:string;price:number;description:string;featured?:boolean;availability?:string};
export const products:Product[]=[
{id:'six',name:'Six de panquecitos',category:'Gancho',price:150,description:'6 panquecitos en recipiente con papel grado alimenticio.',featured:true,availability:'Sobre pedido recomendado'},
{id:'single',name:'Panquecito individual',category:'Gancho',price:25,description:'Pieza individual, sujeto a disponibilidad.',availability:'8:00 a 11:00 h'},
{id:'waffle',name:'Waffle',category:'Desayunos',price:0,description:'Consulta sabores y disponibilidad.'},
{id:'crepa',name:'Crepa',category:'Desayunos',price:0,description:'Consulta sabores y disponibilidad.'},
{id:'shake',name:'Malteada',category:'Bebidas',price:80,description:'Preparada al momento.'},
{id:'special',name:'Especialidad de malteada',category:'Bebidas',price:0,description:'Pregunta por la especialidad del día.'},
{id:'tea',name:'Té',category:'Bebidas',price:40,description:'Bebida preparada al momento.'},
{id:'aloe',name:'Aloe',category:'Bebidas',price:40,description:'Bebida preparada al momento.'},
{id:'fiber',name:'Fibra',category:'Bebidas',price:0,description:'Consulta disponibilidad.'},
{id:'fruit',name:'Ponche de frutas',category:'Bebidas',price:0,description:'Consulta disponibilidad.'},
{id:'rolls',name:'Rollitos salados',category:'Especialidades',price:0,description:'Consulta disponibilidad.'},
{id:'coffee',name:'Café grano arábica',category:'Promoción',price:0,description:'Regalo en la primera compra del six de panquecitos.'}
];