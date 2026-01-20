import { defineDb, defineTable, column } from 'astro:db';

// Tabla Clientes
const Cliente = defineTable({
  columns: {
    id: column.number({ primaryKey: true }), // Autoincremental por defecto
    nombre: column.text(),
    observaciones: column.text({ optional: true }),
  }
});

// Tabla Matrículas
const Matricula = defineTable({
  columns: {
    id: column.number({ primaryKey: true }),
    numero: column.text({ unique: true }), // La matrícula debe ser única
    clienteId: column.number({ references: () => Cliente.columns.id }),
  }
});

// Tabla Repostajes
const Repostaje = defineTable({
  columns: {
    id: column.number({ primaryKey: true }),
    fecha: column.date({ default: new Date() }),
    importe: column.number(), // Ejemplo: 50.25
    cantidad: column.number(), // Ejemplo: 40.5 (litros)
    comentarios: column.text({ optional: true }),
    numeroOperacion: column.number({ optional: true }),
    
    // Relaciones
    clienteId: column.number({ references: () => Cliente.columns.id }),
    matriculaId: column.number({ references: () => Matricula.columns.id }),
  }
});

export default defineDb({
  tables: { Cliente, Matricula, Repostaje },
});