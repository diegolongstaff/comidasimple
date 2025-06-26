import { db } from "./db";
import { eq, and, sql } from "drizzle-orm";
import {
  usuarios,
  familias,
  recetas,
  tags,
  momento,
  comidasSemana,
  type Usuario,
  type UpsertUsuario,
  type Familia,
  type Receta,
  type Tag,
  type Momento,
  type ComidaSemana,
} from "@shared/schema";

export class SimpleStorage {
  // User operations
  async getUser(id: string): Promise<Usuario | undefined> {
    const [user] = await db.select().from(usuarios).where(eq(usuarios.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<Usuario | undefined> {
    const [user] = await db.select().from(usuarios).where(eq(usuarios.email, email));
    return user;
  }

  async createUser(userData: { email: string; passwordHash: string; nombre?: string; apellido?: string }): Promise<Usuario> {
    const [user] = await db
      .insert(usuarios)
      .values({
        email: userData.email,
        passwordHash: userData.passwordHash,
        nombre: userData.nombre,
        apellido: userData.apellido,
      })
      .returning();
    return user;
  }

  // Family operations
  async isUserFamilyChef(usuarioId: string): Promise<boolean> {
    const [familia] = await db
      .select()
      .from(familias)
      .where(eq(familias.chefId, usuarioId));
    return !!familia;
  }

  async createFamilia(familiaData: { nombre: string; chefId: string }): Promise<Familia> {
    const [familia] = await db
      .insert(familias)
      .values({
        nombre: familiaData.nombre,
        chefId: familiaData.chefId,
        codigoInvitacion: Math.random().toString(36).substring(2, 8).toUpperCase(),
      })
      .returning();
    return familia;
  }

  // Recipe operations
  async getRecetas(): Promise<Receta[]> {
    return await db
      .select()
      .from(recetas)
      .where(eq(recetas.esPublica, true));
  }

  // Tags
  async getTags(): Promise<Tag[]> {
    return await db.select().from(tags);
  }

  // Momentos
  async getMomentos(): Promise<Momento[]> {
    return await db.select().from(momento);
  }

  // Meal planning
  async getComidasSemana(usuarioId: string, fechaInicio: string, fechaFin: string): Promise<any[]> {
    return await db
      .select({
        comida: comidasSemana,
        receta: recetas,
      })
      .from(comidasSemana)
      .leftJoin(recetas, eq(comidasSemana.recetaId, recetas.id))
      .where(and(
        eq(comidasSemana.usuarioId, usuarioId),
        sql`${comidasSemana.fecha} >= ${fechaInicio}`,
        sql`${comidasSemana.fecha} <= ${fechaFin}`
      ));
  }

  async planearComida(comidaData: { usuarioId: string; fecha: string; momento: string; recetaId: string }): Promise<ComidaSemana> {
    const [comida] = await db
      .insert(comidasSemana)
      .values(comidaData)
      .returning();
    return comida;
  }
}

export const simpleStorage = new SimpleStorage();