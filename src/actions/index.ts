import { db, Cliente, Matricula, Repostaje, eq, sql, sum } from 'astro:db';
import { defineAction } from 'astro:actions';
import { z } from 'astro:schema';

export const server = {
    /** * ==========================================
     * SECCIÓN: CLIENTES
     * ==========================================
     */

    // Obtener estadísticas detalladas para el modal de información
    getClientStats: defineAction({
        input: z.object({ id: z.number() }),
        handler: async ({ id }) => {
            const cliente = await db.select().from(Cliente).where(eq(Cliente.id, id)).get();
            const matriculas = await db.select().from(Matricula).where(eq(Matricula.clienteId, id));

            const stats = await db.select({
                totalLitros: sum(Repostaje.cantidad),
                totalImporte: sum(Repostaje.importe),
                count: sql<number>`count(${Repostaje.id})`
            })
            .from(Repostaje)
            .where(eq(Repostaje.clienteId, id))
            .get();

            const ultimo = await db.select()
                .from(Repostaje)
                .where(eq(Repostaje.clienteId, id))
                .orderBy(sql`${Repostaje.fecha} DESC`)
                .limit(1)
                .get();

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

    // Crear o Editar Cliente
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

    // Borrar Cliente
    deleteClient: defineAction({
        accept: 'json',
        input: z.object({ id: z.number() }),
        handler: async ({ id }) => {
            await db.delete(Cliente).where(eq(Cliente.id, id));
            return { success: true };
        },
    }),

    /** * ==========================================
     * SECCIÓN: MATRÍCULAS
     * ==========================================
     */

    // Crear o Editar Matrícula (Incluye búsqueda de ID por Nombre de Cliente)
    upsertMatricula: defineAction({
        accept: 'form',
        input: z.object({
            id: z.string().optional(), // Presente si editamos, vacío si creamos
            numero: z.string(),
            clienteNombre: z.string(),
        }),
        handler: async ({ id, numero, clienteNombre }) => {
            const nombreLimpio = clienteNombre.trim();

            // Buscamos el ID del cliente basado en el nombre del select/datalist
            const cliente = await db.select()
                .from(Cliente)
                .where(sql`LOWER(${Cliente.nombre}) = LOWER(${nombreLimpio})`)
                .get();

            if (!cliente) {
                throw new Error(`El cliente "${nombreLimpio}" no existe.`);
            }

            const data = {
                numero: numero.trim().toUpperCase(),
                clienteId: cliente.id
            };

            if (id && id !== "") {
                // OPERACIÓN: EDITAR
                await db.update(Matricula)
                    .set(data)
                    .where(eq(Matricula.id, Number(id)));
            } else {
                // OPERACIÓN: CREAR
                await db.insert(Matricula).values(data);
            }
            return { success: true };
        },
    }),

    // Borrar Matrícula
    deleteMatricula: defineAction({
        accept: 'json',
        input: z.object({ id: z.number() }),
        handler: async ({ id }) => {
            await db.delete(Matricula).where(eq(Matricula.id, id));
            return { success: true };
        },
    }),

    //** * ==========================================
    // SECCIÓN: REPOSTAJES
    // ========================================== */

    // Crear RepostajecreateRepostaje: defineAction({
    createRepostaje: defineAction({
        accept: 'form',
        input: z.object({
        fecha: z.string(),
        numeroOperacion: z.string().optional(),
        clienteNombre: z.string(),
        cantidad: z.string().transform(Number),
        importe: z.string().transform(Number),
        matriculaNumero: z.string(),
        comentarios: z.string().optional(),
        }),
        handler: async (input) => {
        try {
            // 1. Buscar el ID del Cliente por su nombre
            const [cliente] = await db
            .select()
            .from(Cliente)
            .where(eq(Cliente.nombre, input.clienteNombre));

            if (!cliente) throw new Error('Cliente no encontrado');

            // 2. Buscar el ID de la Matrícula por su número
            const [matricula] = await db
            .select()
            .from(Matricula)
            .where(eq(Matricula.numero, input.matriculaNumero));

            if (!matricula) throw new Error('Matrícula no encontrada');

            // 3. Insertar el repostaje con los IDs encontrados
            await db.insert(Repostaje).values({
            fecha: new Date(input.fecha),
            numeroOperacion: input.numeroOperacion ? Number(input.numeroOperacion) : null,
            importe: input.importe,
            cantidad: input.cantidad,
            comentarios: input.comentarios || '',
            clienteId: cliente.id,
            matriculaId: matricula.id,
            });

            return { success: true };
        } catch (e: any) {
            console.error(e);
            throw new Error(e.message || 'Error al guardar el repostaje');
        }
        },
    }),
};