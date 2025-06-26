import {
  usuarios,
  familias,
  miembrosFamilia,
  recetas,
  tags,
  momento,
  recetaTag,
  recetaIngredientes,
  ingredientes,
  recetasPuntaje,
  comidasSemana,
  recetasFavoritas,
  type Usuario,
  type UpsertUsuario,
  type Familia,
  type InsertFamilia,
  type MiembroFamilia,
  type InsertMiembroFamilia,
  type Receta,
  type InsertReceta,
  type Tag,
  type Momento,
  type RecetaPuntaje,
  type InsertRecetaPuntaje,
  type ComidaSemana,
  type InsertComidaSemana,
  type RecetaFavorita,
  type InsertRecetaFavorita,
  type Ingrediente,
  type RecetaIngrediente,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, sql, inArray } from "drizzle-orm";

export interface IStorage {
  // User operations (supports both Google OAuth and local auth)
  getUser(id: string): Promise<Usuario | undefined>;
  getUserByEmail(email: string): Promise<Usuario | undefined>;
  upsertUser(user: UpsertUsuario): Promise<Usuario>;
  createUser(user: { email: string; passwordHash: string; firstName?: string; lastName?: string; provider?: string }): Promise<Usuario>;
  
  // Family operations
  createFamilia(familia: InsertFamilia): Promise<Familia>;
  getFamiliaByCodigoInvitacion(codigo: string): Promise<Familia | undefined>;
  getFamiliaByUsuario(usuarioId: string): Promise<Familia | undefined>;
  getMiembrosFamilia(familiaId: string): Promise<MiembroFamilia[]>;
  addMiembroFamilia(miembro: InsertMiembroFamilia): Promise<MiembroFamilia>;
  isUserFamilyChef(usuarioId: string): Promise<boolean>;
  
  // Recipe operations
  getRecetas(usuarioId: string, tags?: string[]): Promise<(Receta & { tags: Tag[]; rating?: number })[]>;
  getRecetaById(id: string): Promise<(Receta & { tags: Tag[]; ingredientes: (RecetaIngrediente & { ingrediente: Ingrediente })[] }) | undefined>;
  createReceta(receta: InsertReceta): Promise<Receta>;
  getRecetasFavoritas(usuarioId: string): Promise<(RecetaFavorita & { receta: Receta })[]>;
  toggleRecetaFavorita(data: InsertRecetaFavorita): Promise<void>;
  rateReceta(rating: InsertRecetaPuntaje): Promise<RecetaPuntaje>;
  
  // Meal planning operations
  getComidasSemana(usuarioId: string, fechaInicio: string, fechaFin: string): Promise<(ComidaSemana & { receta: Receta })[]>;
  planearComida(comida: InsertComidaSemana): Promise<ComidaSemana>;
  eliminarComidaSemana(id: string): Promise<void>;
  
  // Tags
  getTags(): Promise<Tag[]>;
  
  // Momento operations
  getMomentos(): Promise<Momento[]>;
  getMomentoByNombre(nombre: string): Promise<Momento | undefined>;
  
  // Grocery list
  getIngredientesParaSemana(usuarioId: string, fechaInicio: string, fechaFin: string): Promise<{ ingrediente: Ingrediente; cantidadTotal: number; unidadMedida: string }[]>;
}

export class DatabaseStorage implements IStorage {
  // User operations (mandatory for Replit Auth)
  async getUser(id: string): Promise<Usuario | undefined> {
    const [user] = await db.select().from(usuarios).where(eq(usuarios.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<Usuario | undefined> {
    const [user] = await db.select().from(usuarios).where(eq(usuarios.email, email));
    return user;
  }

  async upsertUser(userData: UpsertUsuario): Promise<Usuario> {
    const [user] = await db
      .insert(usuarios)
      .values(userData)
      .onConflictDoUpdate({
        target: usuarios.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async createUser(userData: { email: string; passwordHash: string; firstName?: string; lastName?: string; provider?: string }): Promise<User> {
    const id = `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const [user] = await db
      .insert(users)
      .values({
        id,
        email: userData.email,
        passwordHash: userData.passwordHash,
        firstName: userData.firstName,
        lastName: userData.lastName,
        provider: userData.provider || 'local',
      })
      .returning();
    return user;
  }

  // Family operations
  async createFamilia(familiaData: InsertFamilia): Promise<Familia> {
    const codigoInvitacion = `FAM-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const [familia] = await db
      .insert(familias)
      .values({ ...familiaData, codigoInvitacion })
      .returning();
    return familia;
  }

  async getFamiliaByCodigoInvitacion(codigo: string): Promise<Familia | undefined> {
    const [familia] = await db
      .select()
      .from(familias)
      .where(eq(familias.codigoInvitacion, codigo));
    return familia;
  }

  async getFamiliaByUsuario(usuarioId: string): Promise<Familia | undefined> {
    const [result] = await db
      .select({ familia: familias })
      .from(miembrosFamilia)
      .innerJoin(familias, eq(miembrosFamilia.familiaId, familias.id))
      .where(eq(miembrosFamilia.usuarioId, usuarioId));
    return result?.familia;
  }

  async getMiembrosFamilia(familiaId: string): Promise<MiembroFamilia[]> {
    return await db
      .select()
      .from(miembrosFamilia)
      .where(eq(miembrosFamilia.familiaId, familiaId));
  }

  async addMiembroFamilia(miembroData: InsertMiembroFamilia): Promise<MiembroFamilia> {
    const [miembro] = await db
      .insert(miembrosFamilia)
      .values(miembroData)
      .returning();
    return miembro;
  }

  async isUserFamilyChef(usuarioId: string): Promise<boolean> {
    const [familia] = await db
      .select()
      .from(familias)
      .where(eq(familias.chefId, usuarioId));
    return !!familia;
  }

  // Recipe operations
  async getRecetas(usuarioId: string, tagIds?: string[]): Promise<(Receta & { tags: Tag[]; rating?: number })[]> {
    let query = db
      .select({
        receta: recetas,
        tag: tags,
        rating: recetasPuntaje.puntaje,
      })
      .from(recetas)
      .leftJoin(recetaTag, eq(recetas.id, recetaTag.recetaId))
      .leftJoin(tags, eq(recetaTag.tagId, tags.id))
      .leftJoin(recetasPuntaje, and(
        eq(recetas.id, recetasPuntaje.recetaId),
        eq(recetasPuntaje.usuarioId, usuarioId)
      ))
      .where(
        // Show recipes that are either:
        // 1. Public recipes (es_publica = true)
        // 2. Private recipes owned by this user (es_publica = false AND usuario_id = current user)
        sql`(${recetas.esPublica} = true OR (${recetas.esPublica} = false AND ${recetas.usuarioId} = ${usuarioId}))`
      );

    if (tagIds && tagIds.length > 0) {
      query = query.where(inArray(tags.id, tagIds));
    }

    const results = await query;
    
    // Group by recipe and aggregate tags
    const recetaMap = new Map<string, Receta & { tags: Tag[]; rating?: number }>();
    
    for (const result of results) {
      const recetaId = result.receta.id;
      if (!recetaMap.has(recetaId)) {
        recetaMap.set(recetaId, {
          ...result.receta,
          tags: [],
          rating: result.rating ? Number(result.rating) : undefined,
        });
      }
      
      if (result.tag) {
        recetaMap.get(recetaId)!.tags.push(result.tag);
      }
    }
    
    return Array.from(recetaMap.values());
  }

  async getRecetaById(id: string): Promise<(Receta & { tags: Tag[]; ingredientes: (RecetaIngrediente & { ingrediente: Ingrediente })[] }) | undefined> {
    const [receta] = await db.select().from(recetas).where(eq(recetas.id, id));
    if (!receta) return undefined;

    const recetaTags = await db
      .select({ tag: tags })
      .from(recetaTag)
      .innerJoin(tags, eq(recetaTag.tagId, tags.id))
      .where(eq(recetaTag.recetaId, id));

    const recetaIngredientes = await db
      .select({
        recetaIngrediente: recetaIngredientes,
        ingrediente: ingredientes,
      })
      .from(recetaIngredientes)
      .innerJoin(ingredientes, eq(recetaIngredientes.ingredienteId, ingredientes.id))
      .where(eq(recetaIngredientes.recetaId, id));

    return {
      ...receta,
      tags: recetaTags.map(rt => rt.tag),
      ingredientes: recetaIngredientes.map(ri => ({
        ...ri.recetaIngrediente,
        ingrediente: ri.ingrediente,
      })),
    };
  }

  async createReceta(recetaData: InsertReceta): Promise<Receta> {
    const [receta] = await db.insert(recetas).values(recetaData).returning();
    return receta;
  }

  async getRecetasFavoritas(usuarioId: string): Promise<(RecetaFavorita & { receta: Receta })[]> {
    const results = await db
      .select({
        favorita: recetasFavoritas,
        receta: recetas,
      })
      .from(recetasFavoritas)
      .innerJoin(recetas, eq(recetasFavoritas.recetaId, recetas.id))
      .where(eq(recetasFavoritas.usuarioId, usuarioId))
      .orderBy(desc(recetasFavoritas.fechaAgregado));

    return results.map(r => ({ ...r.favorita, receta: r.receta }));
  }

  async toggleRecetaFavorita(data: InsertRecetaFavorita): Promise<void> {
    const existing = await db
      .select()
      .from(recetasFavoritas)
      .where(and(
        eq(recetasFavoritas.usuarioId, data.usuarioId!),
        eq(recetasFavoritas.recetaId, data.recetaId!)
      ));

    if (existing.length > 0) {
      await db
        .delete(recetasFavoritas)
        .where(eq(recetasFavoritas.id, existing[0].id));
    } else {
      await db.insert(recetasFavoritas).values(data);
    }
  }

  async rateReceta(rating: InsertRecetaPuntaje): Promise<RecetaPuntaje> {
    const [result] = await db
      .insert(recetasPuntaje)
      .values(rating)
      .onConflictDoUpdate({
        target: [recetasPuntaje.usuarioId, recetasPuntaje.recetaId],
        set: { puntaje: rating.puntaje },
      })
      .returning();
    return result;
  }

  // Meal planning operations
  async getComidasSemana(usuarioId: string, fechaInicio: string, fechaFin: string): Promise<(ComidaSemana & { receta: Receta; momentoInfo: Momento })[]> {
    const results = await db.execute(sql`
      SELECT 
        cs.*,
        r.*,
        m.*
      FROM comidas_semana cs
      INNER JOIN recetas r ON cs.receta_id = r.id
      INNER JOIN momento m ON cs.momento = m.id
      WHERE cs.usuario_id = ${usuarioId}
        AND cs.fecha >= ${fechaInicio}
        AND cs.fecha <= ${fechaFin}
      ORDER BY cs.fecha
    `);

    return results.rows.map(row => ({
      id: row.id,
      usuarioId: row.usuario_id,
      fecha: row.fecha,
      recetaId: row.receta_id,
      momento: row.momento,
      receta: {
        id: row.id,
        nombre: row.nombre,
        descripcion: row.descripcion,
        // Map other recipe fields as needed
      },
      momentoInfo: {
        id: row.id,
        momento: row.momento,
        // Map other momento fields as needed
      }
    }));
  }

  async planearComida(comidaData: InsertComidaSemana): Promise<ComidaSemana> {
    const result = await db.execute(sql`
      INSERT INTO comidas_semana (usuario_id, fecha, receta_id, momento)
      VALUES (${comidaData.usuarioId}, ${comidaData.fecha}, ${comidaData.recetaId}, ${comidaData.momento})
      RETURNING *
    `);
    return result.rows[0];
  }

  async eliminarComidaSemana(id: string): Promise<void> {
    await db.delete(comidasSemana).where(eq(comidasSemana.id, id));
  }

  // Tags
  async getTags(): Promise<Tag[]> {
    return await db.select().from(tags);
  }

  // Momento operations
  async getMomentos(): Promise<Momento[]> {
    return await db.select().from(momento);
  }

  async getMomentoByNombre(nombre: string): Promise<Momento | undefined> {
    const [result] = await db.select().from(momento).where(eq(momento.momento, nombre));
    return result;
  }

  // Grocery list
  async getIngredientesParaSemana(usuarioId: string, fechaInicio: string, fechaFin: string): Promise<{ ingrediente: Ingrediente; cantidadTotal: number; unidadMedida: string }[]> {
    const results = await db
      .select({
        ingrediente: ingredientes,
        cantidad: recetaIngredientes.cantidad,
        unidadMedida: recetaIngredientes.unidadMedida,
        porcionesBase: recetas.porcionesBase,
      })
      .from(comidasSemana)
      .innerJoin(recetas, eq(comidasSemana.recetaId, recetas.id))
      .innerJoin(recetaIngredientes, eq(recetas.id, recetaIngredientes.recetaId))
      .innerJoin(ingredientes, eq(recetaIngredientes.ingredienteId, ingredientes.id))
      .where(and(
        eq(comidasSemana.usuarioId, usuarioId),
        sql`${comidasSemana.fecha} >= ${fechaInicio}`,
        sql`${comidasSemana.fecha} <= ${fechaFin}`
      ));

    // Aggregate ingredients by name and unit
    const ingredientMap = new Map<string, { ingrediente: Ingrediente; cantidadTotal: number; unidadMedida: string }>();
    
    for (const result of results) {
      const key = `${result.ingrediente.id}-${result.unidadMedida}`;
      const multiplier = (result.porciones || 4) / (result.porcionesBase || 4);
      const cantidadAjustada = Number(result.cantidad) * multiplier;
      
      if (ingredientMap.has(key)) {
        ingredientMap.get(key)!.cantidadTotal += cantidadAjustada;
      } else {
        ingredientMap.set(key, {
          ingrediente: result.ingrediente,
          cantidadTotal: cantidadAjustada,
          unidadMedida: result.unidadMedida || 'unidad',
        });
      }
    }
    
    return Array.from(ingredientMap.values());
  }
}

export const storage = new DatabaseStorage();
