import {
  pgTable,
  text,
  varchar,
  timestamp,
  jsonb,
  index,
  uuid,
  boolean,
  integer,
  numeric,
  date,
  serial,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table (mandatory for Replit Auth)
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User authentication table - using existing usuarios table
export const usuarios = pgTable("usuarios", {
  id: uuid("id").primaryKey().defaultRandom(),
  fechaRegistro: timestamp("fecha_registro").defaultNow().notNull(),
  email: text("email"),
  nombre: text("nombre"),
  apellido: text("apellido"),
  esChef: boolean("es_chef"),
  authId: uuid("auth_id"),
  familiaId: uuid("familia_id"),
  passwordHash: text("password_hash"),
  rol: text("rol").default("usuario").notNull(),
});

// Supabase schema tables
export const familias = pgTable("familias", {
  id: uuid("id").primaryKey().defaultRandom(),
  nombre: text("nombre").notNull(),
  chefId: uuid("chef_id"),
  planId: integer("plan_id"),
  fechaCreacion: timestamp("fecha_creacion"),
  codigoInvitacion: varchar("codigo_invitacion").unique(),
});

export const miembrosFamilia = pgTable("miembros_familia", {
  id: uuid("id").primaryKey().defaultRandom(),
  familiaId: uuid("familia_id").references(() => familias.id).notNull(),
  usuarioId: uuid("usuario_id").references(() => usuarios.id),
  nombre: text("nombre").notNull(),
  apellido: text("apellido"),
  email: varchar("email"),
  fechaNacimiento: date("fecha_nacimiento"),
  sexo: text("sexo"),
  pesoKg: numeric("peso_kg"),
  alturaCm: numeric("altura_cm"),
  esJefeFamilia: boolean("es_jefe_familia").default(false),
  grupoEdad: text("grupo_edad"),
  codigoInvitacion: varchar("codigo_invitacion"),
});

export const categorias = pgTable("categorias", {
  id: uuid("id").primaryKey().defaultRandom(),
  nombre: text("nombre").notNull(),
  descripcion: text("descripcion"),
});

export const marcas = pgTable("marcas", {
  id: uuid("id").primaryKey().defaultRandom(),
  nombre: text("nombre").notNull(),
});

export const ingredientes = pgTable("ingredientes", {
  id: uuid("id").primaryKey().defaultRandom(),
  nombre: text("nombre").notNull(),
  descripcion: text("descripcion"),
  kcal100: numeric("kcal_100"),
  prot100: numeric("prot_100"),
  grasa100: numeric("grasa_100"),
  carb100: numeric("carb_100"),
  fibra100: numeric("fibra_100"),
  usuarioId: varchar("usuario_id").references(() => usuarios.id),
  esPublico: boolean("es_publico").default(false),
  categoriaId: uuid("categoria_id").references(() => categorias.id),
  marcaId: uuid("marca_id").references(() => marcas.id),
});

export const recetas = pgTable("recetas", {
  id: uuid("id").primaryKey().defaultRandom(),
  usuarioId: uuid("usuario_id").references(() => usuarios.id),
  nombre: text("nombre").notNull(),
  descripcion: text("descripcion"),
  esOficial: boolean("es_oficial").default(false),
  esPublica: boolean("es_publica").default(false),
  imagenUrl: text("imagen_url"),
  porcionesBase: integer("porciones_base").default(4),
  tiempoMin: integer("tiempo_min"),
  // Campos nutricionales por porción
  caloriasPorPorcion: numeric("calorias_por_porcion"),
  proteinasG: numeric("proteinas_g"),
  grasasG: numeric("grasas_g"),
  carbohidratosG: numeric("carbohidratos_g"),
  fibraG: numeric("fibra_g"),
  sodioMg: numeric("sodio_mg"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const tags = pgTable("tags", {
  id: uuid("id").primaryKey().defaultRandom(),
  nombre: text("nombre").notNull(),
  color: varchar("color"),
  icono: varchar("icono"),
});

export const recetaTag = pgTable("receta_tag", {
  id: uuid("id").primaryKey().defaultRandom(),
  recetaId: uuid("receta_id").references(() => recetas.id),
  tagId: uuid("tag_id").references(() => tags.id),
});

export const recetaIngredientes = pgTable("receta_ingredientes", {
  id: uuid("id").primaryKey().defaultRandom(),
  recetaId: uuid("receta_id").references(() => recetas.id),
  ingredienteId: uuid("ingrediente_id").references(() => ingredientes.id),
  cantidad: numeric("cantidad").notNull(),
  unidadMedida: varchar("unidad_medida"),
});

export const recetasPuntaje = pgTable("recetas_puntaje", {
  id: uuid("id").primaryKey().defaultRandom(),
  usuarioId: varchar("usuario_id").references(() => usuarios.id),
  recetaId: uuid("receta_id").references(() => recetas.id),
  fechaAgregado: timestamp("fecha_agregado").defaultNow(),
  puntaje: numeric("puntaje").default("3"),
});

export const momento = pgTable("momento", {
  id: uuid("id").primaryKey().defaultRandom(),
  momento: text("momento").notNull(), // 'Almuerzo', 'Cena'
});

export const comidasSemana = pgTable("comidas_semana", {
  id: uuid("id").primaryKey().defaultRandom(),
  usuarioId: uuid("usuario_id").references(() => usuarios.id),
  fecha: date("fecha").notNull(),
  momento: uuid("momento").references(() => momento.id).notNull(),
  recetaId: uuid("receta_id").references(() => recetas.id),
});

export const recetasFavoritas = pgTable("recetas_favoritas", {
  id: uuid("id").primaryKey().defaultRandom(),
  usuarioId: varchar("usuario_id").references(() => usuarios.id),
  recetaId: uuid("receta_id").references(() => recetas.id),
  fechaAgregado: timestamp("fecha_agregado").defaultNow(),
});

// Insert schemas
export const insertFamiliaSchema = createInsertSchema(familias).omit({
  id: true,
  fechaCreacion: true,
});

export const insertMiembroFamiliaSchema = createInsertSchema(miembrosFamilia).omit({
  id: true,
});

export const insertRecetaSchema = createInsertSchema(recetas).omit({
  id: true,
  createdAt: true,
});

export const insertRecetaPuntajeSchema = createInsertSchema(recetasPuntaje).omit({
  id: true,
  fechaAgregado: true,
});

export const insertComidaSemanaSchema = createInsertSchema(comidasSemana).omit({
  id: true,
});

export const insertRecetaFavoritaSchema = createInsertSchema(recetasFavoritas).omit({
  id: true,
  fechaAgregado: true,
});

// Types
export type UpsertUsuario = typeof usuarios.$inferInsert;
export type Usuario = typeof usuarios.$inferSelect;
export type Familia = typeof familias.$inferSelect;
export type InsertFamilia = z.infer<typeof insertFamiliaSchema>;
export type MiembroFamilia = typeof miembrosFamilia.$inferSelect;
export type InsertMiembroFamilia = z.infer<typeof insertMiembroFamiliaSchema>;
export type Receta = typeof recetas.$inferSelect;
export type InsertReceta = z.infer<typeof insertRecetaSchema>;
export type Tag = typeof tags.$inferSelect;
export type Momento = typeof momento.$inferSelect;
export type RecetaPuntaje = typeof recetasPuntaje.$inferSelect;
export type InsertRecetaPuntaje = z.infer<typeof insertRecetaPuntajeSchema>;
export type ComidaSemana = typeof comidasSemana.$inferSelect;
export type InsertComidaSemana = z.infer<typeof insertComidaSemanaSchema>;
export type RecetaFavorita = typeof recetasFavoritas.$inferSelect;
export type InsertRecetaFavorita = z.infer<typeof insertRecetaFavoritaSchema>;
export type Ingrediente = typeof ingredientes.$inferSelect;
export type RecetaIngrediente = typeof recetaIngredientes.$inferSelect;
