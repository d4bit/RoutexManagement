import { db, Cliente, Matricula } from 'astro:db';

export default async function seed() {
// 1. Creamos clientes
const clientes = await db.insert(Cliente).values([
	{ nombre: 'Transportes Rápido SL', observaciones: 'Cliente VIP - Pago a 30 días' },
	{ nombre: 'Logística David', observaciones: 'Sin incidencias' },
]).returning();

// 2. Creamos matrículas asociadas
await db.insert(Matricula).values([
	{ placa: '1234-BBB', clienteId: clientes[0].id },
	{ placa: '5678-CCC', clienteId: clientes[0].id },
	{ placa: '9999-ZZZ', clienteId: clientes[1].id },
]);

console.log('Seed completado con éxito 🚀');
}