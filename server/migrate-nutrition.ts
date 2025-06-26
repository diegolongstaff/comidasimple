import { db } from "./db";
import { sql } from "drizzle-orm";

export async function addNutritionColumns() {
  try {
    // Add nutritional columns to recetas table
    await db.execute(sql`
      ALTER TABLE recetas 
      ADD COLUMN IF NOT EXISTS calorias_por_porcion NUMERIC,
      ADD COLUMN IF NOT EXISTS proteinas_g NUMERIC,
      ADD COLUMN IF NOT EXISTS grasas_g NUMERIC,
      ADD COLUMN IF NOT EXISTS carbohidratos_g NUMERIC,
      ADD COLUMN IF NOT EXISTS fibra_g NUMERIC,
      ADD COLUMN IF NOT EXISTS sodio_mg NUMERIC
    `);

    // Update some existing recipes with sample nutritional data
    await db.execute(sql`
      UPDATE recetas SET 
        calorias_por_porcion = 350,
        proteinas_g = 25,
        grasas_g = 12,
        carbohidratos_g = 45,
        fibra_g = 6,
        sodio_mg = 45
      WHERE (nombre ILIKE '%tortilla%' OR nombre ILIKE '%huevo%') AND calorias_por_porcion IS NULL
    `);

    await db.execute(sql`
      UPDATE recetas SET 
        calorias_por_porcion = 380,
        proteinas_g = 10,
        grasas_g = 8,
        carbohidratos_g = 60,
        fibra_g = 7,
        sodio_mg = 60
      WHERE (nombre ILIKE '%pasta%' OR nombre ILIKE '%spaghetti%') AND calorias_por_porcion IS NULL
    `);

    await db.execute(sql`
      UPDATE recetas SET 
        calorias_por_porcion = 420,
        proteinas_g = 30,
        grasas_g = 15,
        carbohidratos_g = 35,
        fibra_g = 8,
        sodio_mg = 80
      WHERE (nombre ILIKE '%pollo%' OR nombre ILIKE '%carne%') AND calorias_por_porcion IS NULL
    `);

    await db.execute(sql`
      UPDATE recetas SET 
        calorias_por_porcion = 280,
        proteinas_g = 12,
        grasas_g = 6,
        carbohidratos_g = 40,
        fibra_g = 9,
        sodio_mg = 35
      WHERE (nombre ILIKE '%ensalada%' OR nombre ILIKE '%verdura%') AND calorias_por_porcion IS NULL
    `);

    console.log("Nutritional columns added and sample data updated successfully");
    return true;
  } catch (error) {
    console.error("Error adding nutritional columns:", error);
    return false;
  }
}