import { db, Cliente, Matricula, eq, sql } from 'astro:db';
import { defineAction } from 'astro:actions';
import { z } from 'astro:schema';

export const server = {
    getClientStats: defineAction({
        input: z.object({ id: z.number() }),
        handler: async ({ id }) => {
            // 1. Datos básicos y matrículas
            const cliente = await db.select().from(Cliente).where(eq(Cliente.id, id)).get();
            const matriculas = await db.select().from(Matricula).where(eq(Matricula.clienteId, id));

            // 2. Agregados totales (Litros e Importe)
            const stats = await db.select({
                totalLitros: sum(Repostaje.cantidad),
                totalImporte: sum(Repostaje.importe),
                count: sql<number>`count(${Repostaje.id})`
            })
            .from(Repostaje)
            .where(eq(Repostaje.clienteId, id))
            .get();

            // 3. Último repostaje
            const ultimo = await db.select()
                .from(Repostaje)
                .where(eq(Repostaje.clienteId, id))
                .orderBy(sql`${Repostaje.fecha} DESC`)
                .limit(1)
                .get();

            // 4. Eficiencia por matrícula (Top vehículos que más gastan)
            const eficiencia = await db.select({
                numero: Matricula.numero,
                total: sum(Repostaje.importe)
            })
            .from(Repostaje)
            .innerJoin(Matricula, eq(Repostaje.matriculaId, Matricula.id))
            .where(eq(Repostaje.clienteId, id))
            .groupBy(Matricula.numero)
            .limit(3);

            return {
                nombre: cliente?.nombre,
                observaciones: cliente?.observaciones,
                litros: stats?.totalLitros || 0,
                importe: stats?.totalImporte || 0,
                numMatriculas: matriculas.length,
                listaMatriculas: matriculas.map(m => m.numero),
                ultimoPago: ultimo?.fecha,
                eficiencia
            };
        }
    }),

    upsertClient: defineAction({
        accept: 'form',
        input: z.object({
            id: z.string().optional(),
            nombre: z.string(),
            observaciones: z.string().optional(),
        }),
        handler: async ({ id, nombre, observaciones }) => {
            if (id && id !== "") {
                await db.update(Cliente)
                    .set({ nombre, observaciones })
                    .where(eq(Cliente.id, Number(id)));
            } else {
                await db.insert(Cliente).values({ nombre, observaciones });
            }
            return { success: true };
        },
    }),

    deleteClient: defineAction({
        accept: 'json',
        input: z.object({ id: z.number() }),
        handler: async ({ id }) => {
            await db.delete(Cliente).where(eq(Cliente.id, id));
            return { success: true };
        },
    }),

    upsertMatricula: defineAction({
        accept: 'form',
        input: z.object({
            id: z.string().optional(),
            numero: z.string(),
            clienteNombre: z.string(),
        }),
        handler: async ({ id, numero, clienteNombre }) => {
            // 1. Limpiamos el nombre (quitamos espacios al principio y final)
            const nombreLimpio = clienteNombre.trim();

            // 2. Buscamos al cliente (Usamos LOWER para que no falle por mayúsculas)
            const cliente = await db.select()
                .from(Cliente)
                .where(sql`LOWER(${Cliente.nombre}) = LOWER(${nombreLimpio})`)
                .get();

            if (!cliente) {
                console.error(`Error: Cliente "${nombreLimpio}" no encontrado en la DB.`);
                throw new Error("El cliente seleccionado no existe en nuestra base de datos.");
            }

            if (id && id !== "") {
                await db.update(Matricula)
                    .set({
                        numero: numero.trim().toUpperCase(),
                        clienteId: cliente.id
                    })
                    .where(eq(Matricula.id, Number(id)));
            } else {
                await db.insert(Matricula).values({
                    numero: numero.trim().toUpperCase(),
                    clienteId: cliente.id
                });
            }
            return { success: true };
        },
    }),

    deleteMatricula: defineAction({
        accept: 'json',
        input: z.object({ id: z.number() }),
        handler: async ({ id }) => {
            await db.delete(Matricula).where(eq(Matricula.id, id));
            return { success: true };
        },
    }),
    
};