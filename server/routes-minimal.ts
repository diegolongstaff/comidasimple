import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth, isAuthenticated } from "./auth-simple";
import { db } from "./db";
import { usuarios, familias, miembrosFamilia, recetas, tags, momento, comidasSemana, recetaTag, recetasPuntaje } from "@shared/schema";
import { eq, and, sql, desc } from "drizzle-orm";
import { addNutritionColumns } from "./migrate-nutrition";

// Weekly meal plan generation logic
function generateWeeklyMealPlan({ recetas, recentRecipeIds, momentos, fechaInicio, preferencias }: any) {
  const plan: any[] = [];
  const usedRecipes = new Set();
  
  // Filter recipes based on preferences
  const filteredRecetas = recetas.filter((receta: any) => {
    // Skip recently used recipes
    if (recentRecipeIds.has(receta.id)) return false;
    
    // Apply preference filters
    if (preferencias.vegetariano && !hasTag(receta.tags, 'Vegetariano')) return false;
    if (preferencias.sinGluten && !hasTag(receta.tags, 'Sin Gluten')) return false;
    if (preferencias.tiempoMaximo && receta.tiempo_min > preferencias.tiempoMaximo) return false;
    
    return true;
  });
  
  // Generate 7 days of meals
  for (let day = 0; day < 7; day++) {
    const fecha = new Date(fechaInicio);
    fecha.setDate(fecha.getDate() + day);
    const fechaStr = fecha.toISOString().split('T')[0];
    
    // Reset category tracking for new day
    const dayCategories = new Set();
    
    // Generate meals for each moment of the day
    for (const momento of momentos) {
      const availableRecetas = filteredRecetas.filter((receta: any) => {
        // Don't repeat recipes in the same week
        if (usedRecipes.has(receta.id)) return false;
        
        // Don't repeat categories on the same day
        const recipeCategories = receta.tags.map((tag: any) => tag.nombre);
        if (recipeCategories.some((cat: string) => dayCategories.has(cat))) return false;
        
        // Prefer appropriate time recipes for each moment
        if (momento.nombre === 'Desayuno' && receta.tiempo_min > 20) return false;
        if (momento.nombre === 'Almuerzo' && hasTag(receta.tags, 'Cena')) return false;
        
        return true;
      });
      
      if (availableRecetas.length === 0) continue;
      
      // Select best recipe using weighted random selection
      const selectedReceta = selectBestRecipe(availableRecetas, momento.nombre);
      
      if (selectedReceta) {
        plan.push({
          fecha: fechaStr,
          momento: momento.nombre,
          receta_id: selectedReceta.id,
          receta: selectedReceta
        });
        
        usedRecipes.add(selectedReceta.id);
        selectedReceta.tags.forEach((tag: any) => dayCategories.add(tag.nombre));
      }
    }
  }
  
  return plan;
}

function hasTag(tags: any[], tagName: string): boolean {
  return tags.some(tag => tag.nombre === tagName);
}

function selectBestRecipe(recipes: any[], momento: string): any {
  if (recipes.length === 0) return null;
  
  // Weight recipes by rating and appropriateness
  const weightedRecipes = recipes.map((receta: any) => {
    let weight = receta.rating_promedio || 3; // Base weight from rating
    
    // Boost weight for moment-appropriate recipes
    if (momento === 'Desayuno' && hasTag(receta.tags, 'Desayuno')) weight += 2;
    if (momento === 'Almuerzo' && hasTag(receta.tags, 'Almuerzo')) weight += 2;
    if (momento === 'Cena' && hasTag(receta.tags, 'Cena')) weight += 2;
    
    // Boost quick recipes for busy times
    if (receta.tiempo_min <= 20) weight += 1;
    
    return { receta, weight };
  });
  
  // Sort by weight and add some randomness
  weightedRecipes.sort((a, b) => {
    const weightDiff = b.weight - a.weight;
    if (Math.abs(weightDiff) < 0.5) {
      return Math.random() - 0.5; // Random for similar weights
    }
    return weightDiff;
  });
  
  // Select from top 3 options for variety
  const topOptions = weightedRecipes.slice(0, Math.min(3, weightedRecipes.length));
  const randomIndex = Math.floor(Math.random() * topOptions.length);
  
  return topOptions[randomIndex].receta;
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Check and add nutritional columns
  app.get('/api/check-nutrition-columns', isAuthenticated, async (req: any, res) => {
    try {
      // Check if columns exist
      const columnsCheck = await db.execute(sql`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'recetas' 
          AND column_name IN ('calorias_por_porcion', 'proteinas_g', 'grasas_g', 'carbohidratos_g', 'fibra_g', 'sodio_mg')
      `);

      const existingColumns = columnsCheck.rows.map((row: any) => row.column_name);
      
      if (existingColumns.length === 0) {
        // Add the columns
        await db.execute(sql`
          ALTER TABLE recetas 
          ADD COLUMN calorias_por_porcion NUMERIC,
          ADD COLUMN proteinas_g NUMERIC,
          ADD COLUMN grasas_g NUMERIC,
          ADD COLUMN carbohidratos_g NUMERIC,
          ADD COLUMN fibra_g NUMERIC,
          ADD COLUMN sodio_mg NUMERIC
        `);

        // Add sample nutritional data
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

        res.json({ 
          message: "Nutritional columns added successfully",
          columnsAdded: ['calorias_por_porcion', 'proteinas_g', 'grasas_g', 'carbohidratos_g', 'fibra_g', 'sodio_mg']
        });
      } else {
        res.json({ 
          message: "Nutritional columns already exist",
          existingColumns: existingColumns
        });
      }
    } catch (error) {
      console.error("Error checking/adding nutritional columns:", error);
      res.status(500).json({ 
        message: "Failed to check/add nutritional columns", 
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Logout route (matching client expectation)
  app.get('/api/logout', (req, res) => {
    req.session.destroy((err: any) => {
      if (err) {
        console.error('Logout error:', err);
        return res.status(500).json({ message: 'Error al cerrar sesión' });
      }
      res.clearCookie('connect.sid');
      // Redirect to landing page after logout
      res.redirect('/');
    });
  });

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      res.json(req.user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Update user profile
  app.put('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { nombre, apellido, email } = req.body;
      
      if (!nombre || !apellido || !email) {
        return res.status(400).json({ message: "Name, surname and email are required" });
      }

      // Check if email is already in use by another user
      const [existingUser] = await db
        .select()
        .from(usuarios)
        .where(and(eq(usuarios.email, email), sql`id != ${userId}`));
      
      if (existingUser) {
        return res.status(409).json({ message: "Email already in use" });
      }

      // Update user
      const [updatedUser] = await db
        .update(usuarios)
        .set({ nombre, apellido, email })
        .where(eq(usuarios.id, userId))
        .returning();

      // Update session user data
      req.user.nombre = updatedUser.nombre;
      req.user.apellido = updatedUser.apellido;
      req.user.email = updatedUser.email;

      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  // User status routes
  app.get('/api/user/is-chef', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const [familia] = await db
        .select()
        .from(familias)
        .where(eq(familias.chefId, userId));
      res.json({ isChef: !!familia });
    } catch (error) {
      console.error("Error checking chef status:", error);
      res.status(500).json({ message: "Failed to check chef status" });
    }
  });

  // Family routes
  app.get('/api/familias/mine', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      
      // Check if user is chef of a family
      const [chefFamily] = await db
        .select()
        .from(familias)
        .where(eq(familias.chefId, userId));
      
      if (chefFamily) {
        // Check if chef exists in family members
        const chefMemberCheck = await db.execute(sql`
          SELECT id FROM miembros_familia 
          WHERE familia_id = ${chefFamily.id} AND usuario_id = ${userId}
        `);
        
        // If chef not in family members, add them
        if (chefMemberCheck.rows.length === 0) {
          const user = await db.select().from(usuarios).where(eq(usuarios.id, userId)).limit(1);
          if (user.length > 0) {
            await db.execute(sql`
              INSERT INTO miembros_familia (familia_id, usuario_id, nombre, apellido, es_jefe_familia)
              VALUES (${chefFamily.id}, ${userId}, ${user[0].nombre || 'Chef'}, ${user[0].apellido || ''}, true)
            `);
          }
        }
        
        // Get family members with proper column mapping
        const members = await db.execute(sql`
          SELECT 
            id, 
            nombre, 
            apellido, 
            email, 
            fecha_nacimiento as "fechaNacimiento",
            sexo,
            peso_kg as "pesoKg",
            altura_cm as "alturaCm",
            es_jefe_familia as "esJefeFamilia", 
            grupo_edad as "grupoEdad",
            usuario_id as "usuarioId"
          FROM miembros_familia 
          WHERE familia_id = ${chefFamily.id}
          ORDER BY es_jefe_familia DESC, nombre ASC
        `);
        
        return res.json({
          familia: chefFamily,
          members: members.rows,
          isChef: true
        });
      }
      
      // Check if user is a member of a family
      const [memberRecord] = await db
        .select({
          familia: familias,
          member: miembrosFamilia
        })
        .from(miembrosFamilia)
        .innerJoin(familias, eq(miembrosFamilia.familiaId, familias.id))
        .where(eq(miembrosFamilia.usuarioId, userId));
      
      if (memberRecord) {
        const allMembers = await db.execute(sql`
          SELECT 
            id, 
            nombre, 
            apellido, 
            email, 
            fecha_nacimiento as "fechaNacimiento",
            sexo,
            peso_kg as "pesoKg",
            altura_cm as "alturaCm",
            es_jefe_familia as "esJefeFamilia", 
            grupo_edad as "grupoEdad",
            usuario_id as "usuarioId"
          FROM miembros_familia 
          WHERE familia_id = ${memberRecord.familia.id}
          ORDER BY es_jefe_familia DESC, nombre ASC
        `);
        
        return res.json({
          familia: memberRecord.familia,
          members: allMembers.rows,
          isChef: false
        });
      }
      
      // User has no family
      res.json({ familia: null, members: [], isChef: false });
    } catch (error) {
      console.error("Error fetching family:", error);
      res.status(500).json({ message: "Failed to fetch family" });
    }
  });

  app.post('/api/familias', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { nombre } = req.body;
      
      if (!nombre) {
        return res.status(400).json({ message: "Family name required" });
      }

      // Check if user already has a family
      const [existingFamily] = await db
        .select()
        .from(familias)
        .where(eq(familias.chefId, userId));
      
      if (existingFamily) {
        return res.status(400).json({ message: "You already have a family" });
      }

      const [familia] = await db
        .insert(familias)
        .values({
          nombre,
          chefId: userId,
          codigoInvitacion: Math.random().toString(36).substring(2, 8).toUpperCase(),
        })
        .returning();
      
      // Update user's familia_id
      await db
        .update(usuarios)
        .set({ familiaId: familia.id })
        .where(eq(usuarios.id, userId));
      
      // Add the family chef as the first family member
      const user = await db.select().from(usuarios).where(eq(usuarios.id, userId)).limit(1);
      if (user.length > 0) {
        await db.execute(sql`
          INSERT INTO miembros_familia (familia_id, usuario_id, nombre, apellido, es_jefe_familia)
          VALUES (${familia.id}, ${userId}, ${user[0].nombre || 'Chef'}, ${user[0].apellido || ''}, true)
        `);
      }
      
      res.json(familia);
    } catch (error) {
      console.error("Error creating familia:", error);
      res.status(500).json({ message: "Failed to create familia" });
    }
  });

  app.post('/api/familias/join', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { codigoInvitacion } = req.body;
      
      if (!codigoInvitacion) {
        return res.status(400).json({ message: "Invitation code required" });
      }

      // Check if it's a member invitation code (starts with 'M')
      if (codigoInvitacion.startsWith('M')) {
        // Handle member invitation code
        const memberResult = await db.execute(sql`
          SELECT * FROM miembros_familia 
          WHERE codigo_invitacion = ${codigoInvitacion} AND usuario_id IS NULL
        `);
        
        if (memberResult.rows.length === 0) {
          return res.status(404).json({ message: "Invalid invitation code or already used" });
        }

        const member = memberResult.rows[0];

        // Link user to existing family member profile
        await db.execute(sql`
          UPDATE miembros_familia 
          SET usuario_id = ${userId}, codigo_invitacion = NULL
          WHERE id = ${member.id}
        `);

        // Update user's familia_id
        await db
          .update(usuarios)
          .set({ familiaId: String(member.familia_id) })
          .where(eq(usuarios.id, userId));
        
        return res.json({ message: "Successfully linked to existing family member profile" });
      } else {
        // Handle regular family invitation code
        const [familia] = await db
          .select()
          .from(familias)
          .where(eq(familias.codigoInvitacion, codigoInvitacion));
        
        if (!familia) {
          return res.status(404).json({ message: "Invalid invitation code" });
        }

        // Add user as new family member
        const [member] = await db
          .insert(miembrosFamilia)
          .values({
            familiaId: familia.id,
            usuarioId: userId,
            nombre: req.user.nombre,
            apellido: req.user.apellido,
            email: req.user.email,
          })
          .returning();
        
        // Update user's familia_id
        await db
          .update(usuarios)
          .set({ familiaId: familia.id })
          .where(eq(usuarios.id, userId));
        
        return res.json({ familia, member });
      }
    } catch (error) {
      console.error("Error joining familia:", error);
      res.status(500).json({ message: "Failed to join familia" });
    }
  });

  // Generate invitation code for existing family member
  app.post('/api/familias/members/:memberId/invite', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { memberId } = req.params;
      
      // Check if user is chef of a family
      const [familia] = await db
        .select()
        .from(familias)
        .where(eq(familias.chefId, userId));
      
      if (!familia) {
        return res.status(403).json({ message: "Only family chefs can generate invitations" });
      }

      // Verify the member belongs to the user's family and has no user account
      const memberCheck = await db.execute(sql`
        SELECT * FROM miembros_familia 
        WHERE id = ${memberId} AND familia_id = ${familia.id} AND usuario_id IS NULL
      `);
      
      if (memberCheck.rows.length === 0) {
        return res.status(404).json({ message: "Member not found or already has account" });
      }

      // Generate invitation code and store it in the database
      const invitationCode = `M${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      
      await db.execute(sql`
        UPDATE miembros_familia 
        SET codigo_invitacion = ${invitationCode}
        WHERE id = ${memberId}
      `);
      
      res.json({ invitationCode });
    } catch (error) {
      console.error("Error generating invitation:", error);
      res.status(500).json({ message: "Failed to generate invitation" });
    }
  });

  // Join family using member invitation code
  app.post('/api/familias/join-member', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { codigoInvitacion } = req.body;
      
      if (!codigoInvitacion) {
        return res.status(400).json({ message: "Invitation code required" });
      }

      // Find family member by invitation code
      const memberResult = await db.execute(sql`
        SELECT * FROM miembros_familia 
        WHERE codigo_invitacion = ${codigoInvitacion} AND usuario_id IS NULL
      `);
      
      if (memberResult.rows.length === 0) {
        return res.status(404).json({ message: "Invalid invitation code or already used" });
      }

      const member = memberResult.rows[0];

      // Link user to existing family member profile
      await db.execute(sql`
        UPDATE miembros_familia 
        SET usuario_id = ${userId}, codigo_invitacion = NULL
        WHERE id = ${member.id}
      `);

      // Update user's familia_id
      await db
        .update(usuarios)
        .set({ familiaId: String(member.familia_id) })
        .where(eq(usuarios.id, userId));
      
      res.json({ message: "Successfully linked to existing family member profile" });
    } catch (error) {
      console.error("Error linking to family member:", error);
      res.status(500).json({ message: "Failed to link to family member" });
    }
  });

  app.post('/api/familias/members', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { nombre, apellido = '' } = req.body;
      
      if (!nombre) {
        return res.status(400).json({ message: "Member name required" });
      }

      // Check if user is chef of a family
      const [familia] = await db
        .select()
        .from(familias)
        .where(eq(familias.chefId, userId));
      
      if (!familia) {
        return res.status(403).json({ message: "Only family chefs can add members" });
      }

      // Add new family member using raw SQL to avoid schema compilation issues
      const result = await db.execute(sql`
        INSERT INTO miembros_familia (familia_id, nombre, apellido, es_jefe_familia)
        VALUES (${familia.id}, ${nombre.trim()}, ${apellido?.trim() || ''}, false)
        RETURNING *
      `);
      
      const member = result.rows[0];
      
      res.json(member);
    } catch (error) {
      console.error("Error adding family member:", error);
      res.status(500).json({ message: "Failed to add family member" });
    }
  });

  app.put('/api/familias/members/:memberId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { memberId } = req.params;
      const { nombre, apellido, fechaNacimiento, sexo, pesoKg, alturaCm } = req.body;
      
      // Check if user is chef of a family
      const [familia] = await db
        .select()
        .from(familias)
        .where(eq(familias.chefId, userId));
      
      if (!familia) {
        return res.status(403).json({ message: "Only family chefs can edit members" });
      }

      // Verify the member belongs to the user's family
      const existingMemberResult = await db.execute(sql`
        SELECT * FROM miembros_familia 
        WHERE id = ${memberId} AND familia_id = ${familia.id}
      `);
      
      if (existingMemberResult.rows.length === 0) {
        return res.status(404).json({ message: "Member not found" });
      }
      
      const existingMember = existingMemberResult.rows[0];

      // Calculate age group if birthdate is provided
      let grupoEdad = existingMember.grupo_edad;
      if (fechaNacimiento) {
        const birthDate = new Date(fechaNacimiento);
        const today = new Date();
        const ageInMonths = (today.getFullYear() - birthDate.getFullYear()) * 12 + 
                           (today.getMonth() - birthDate.getMonth());
        
        // Use null for age group to avoid constraint issues
        grupoEdad = null;
      }

      // Update member using raw SQL
      const updatedResult = await db.execute(sql`
        UPDATE miembros_familia 
        SET 
          nombre = ${nombre?.trim() || existingMember.nombre},
          apellido = ${apellido?.trim() || existingMember.apellido},
          fecha_nacimiento = ${fechaNacimiento || existingMember.fecha_nacimiento},
          sexo = ${sexo || existingMember.sexo},
          peso_kg = ${pesoKg ? parseFloat(pesoKg) : existingMember.peso_kg},
          altura_cm = ${alturaCm ? parseFloat(alturaCm) : existingMember.altura_cm},
          grupo_edad = ${grupoEdad}
        WHERE id = ${memberId}
        RETURNING *
      `);
      
      const updatedMember = updatedResult.rows[0];
      
      res.json(updatedMember);
    } catch (error) {
      console.error("Error updating family member:", error);
      res.status(500).json({ message: "Failed to update family member" });
    }
  });

  // Rate recipe endpoint
  app.post('/api/recetas/:id/rate', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const recetaId = req.params.id;
      const { puntaje } = req.body;
      
      if (!puntaje || puntaje < 1 || puntaje > 5) {
        return res.status(400).json({ message: "Rating must be between 1 and 5" });
      }

      // Insert or update rating
      await db.execute(sql`
        INSERT INTO recetas_puntaje (usuario_id, receta_id, puntaje)
        VALUES (${userId}, ${recetaId}, ${puntaje})
        ON CONFLICT (usuario_id, receta_id)
        DO UPDATE SET puntaje = ${puntaje}
      `);

      res.json({ message: "Rating saved successfully" });
    } catch (error) {
      console.error("Error rating recipe:", error);
      res.status(500).json({ message: "Failed to rate recipe" });
    }
  });

  // Get user's personal recipes
  app.get('/api/recetas/mis-recetas', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const tagFilter = req.query.tags ? (req.query.tags as string).split(',').filter(Boolean) : [];
      
      // Get user's personal recipes with their tags and user ratings
      const recetasQuery = await db.execute(sql`
        SELECT 
          r.id,
          r.nombre,
          r.descripcion,
          r.imagen_url,
          r.tiempo_min,
          r.porciones_base,
          r.es_publica,
          r.usuario_id,
          r.created_at,
          COALESCE(
            JSON_AGG(
              CASE WHEN t.id IS NOT NULL 
              THEN JSON_BUILD_OBJECT('id', t.id, 'nombre', t.nombre, 'color', t.color, 'icono', t.icono)
              ELSE NULL END
            ) FILTER (WHERE t.id IS NOT NULL), 
            '[]'::json
          ) as tags,
          ur.puntaje as user_rating
        FROM recetas r
        LEFT JOIN receta_tag rt ON r.id = rt.receta_id
        LEFT JOIN tags t ON rt.tag_id = t.id
        LEFT JOIN recetas_puntaje ur ON r.id = ur.receta_id AND ur.usuario_id = ${userId}
        WHERE r.usuario_id = ${userId}
        GROUP BY r.id, r.nombre, r.descripcion, r.imagen_url, r.tiempo_min, r.porciones_base, r.es_publica, r.usuario_id, r.created_at, ur.puntaje
        ORDER BY r.created_at DESC
      `);
      
      let recetasWithTags = recetasQuery.rows.map((row: any) => ({
        ...row,
        tags: Array.isArray(row.tags) ? row.tags : [],
        rating: row.user_rating || 0,
      }));
      
      // Apply tag filter if provided
      if (tagFilter.length > 0) {
        recetasWithTags = recetasWithTags.filter((receta: any) =>
          tagFilter.some((tagId: string) => 
            receta.tags.some((tag: any) => tag.id === tagId)
          )
        );
      }
      
      res.json(recetasWithTags);
    } catch (error) {
      console.error("Error fetching user recipes:", error);
      res.status(500).json({ message: "Failed to fetch user recipes" });
    }
  });

  // Get ingredients for autocomplete
  app.get('/api/ingredientes', isAuthenticated, async (req: any, res) => {
    try {
      const ingredientes = await db.execute(sql`
        SELECT id, nombre, categoria_id, marca_id 
        FROM ingredientes 
        ORDER BY nombre ASC
      `);
      
      res.json(ingredientes.rows);
    } catch (error) {
      console.error("Error fetching ingredients:", error);
      res.status(500).json({ message: "Failed to fetch ingredients" });
    }
  });

  // Create new recipe (including edited copies)
  app.post('/api/recetas', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const {
        nombre,
        descripcion,
        tiempo_min,
        porciones_base,
        copiada_de_id,
        es_oficial = false,
        es_publica = false
      } = req.body;

      // Create the recipe
      const newRecipeQuery = await db.execute(sql`
        INSERT INTO recetas (
          nombre, descripcion, tiempo_min, porciones_base,
          usuario_id, copiada_de_id, es_oficial, es_publica, created_at
        ) VALUES (
          ${nombre}, ${descripcion}, ${tiempo_min}, ${porciones_base},
          ${userId}, ${copiada_de_id}, ${es_oficial}, ${es_publica}, NOW()
        )
        RETURNING id, nombre, descripcion, tiempo_min, porciones_base, usuario_id, copiada_de_id, es_oficial, es_publica, created_at
      `);

      const newRecipe = newRecipeQuery.rows[0];
      res.json(newRecipe);
    } catch (error) {
      console.error("Error creating recipe:", error);
      res.status(500).json({ message: "Failed to create recipe" });
    }
  });

  // Save generated meal plan
  app.post('/api/guardar-plan-semanal', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { planSemanal } = req.body;
      
      // Delete existing meals for the week
      const fechaInicio = planSemanal[0]?.fecha;
      const fechaFin = new Date(fechaInicio);
      fechaFin.setDate(fechaFin.getDate() + 6);
      
      await db.execute(sql`
        DELETE FROM comidas_semana 
        WHERE usuario_id = ${userId} 
        AND fecha BETWEEN ${fechaInicio} AND ${fechaFin.toISOString().split('T')[0]}
      `);
      
      // Insert new meal plan
      for (const comida of planSemanal) {
        await db.execute(sql`
          INSERT INTO comidas_semana (usuario_id, fecha, momento, receta_id)
          VALUES (${userId}, ${comida.fecha}, ${comida.momento}, ${comida.receta_id})
        `);
      }
      
      res.json({ success: true, message: "Plan semanal guardado exitosamente" });
    } catch (error) {
      console.error("Error saving weekly meal plan:", error);
      res.status(500).json({ message: "Failed to save weekly meal plan" });
    }
  });

  // Generate weekly meal plan
  app.post('/api/generar-plan-semanal', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { fechaInicio, fechaFin, diasSeleccionados = [] } = req.body;

      // Delete existing meals for this week to prevent duplicates
      if (fechaInicio && fechaFin) {
        await db.execute(sql`
          DELETE FROM comidas_semana 
          WHERE usuario_id = ${userId} 
          AND fecha >= ${fechaInicio} 
          AND fecha <= ${fechaFin}
        `);
      }

      // Get available recipes (simplified)
      const recetasQuery = await db.execute(sql`
        SELECT id, nombre, tiempo_min, porciones_base, descripcion, imagen_url
        FROM recetas 
        WHERE es_oficial = true OR usuario_id = ${userId}
        ORDER BY RANDOM()
        LIMIT 50
      `);
      
      const recetas = recetasQuery.rows;
      
      if (recetas.length === 0) {
        return res.status(400).json({ message: 'No hay recetas disponibles' });
      }

      // Get momento IDs for mapping
      const momentosQuery = await db.execute(sql`
        SELECT id, momento 
        FROM momento 
        ORDER BY momento ASC
      `);
      
      const momentos = momentosQuery.rows;
      const momentoMap = new Map();
      momentos.forEach((m: any) => {
        if (m.momento === 'Almuerzo') momentoMap.set('almuerzo', m.id);
        if (m.momento === 'Cena') momentoMap.set('cena', m.id);
      });

      // Generate plan for selected days/meals
      const savedMeals = [];
      
      console.log('Received diasSeleccionados:', diasSeleccionados);
      
      for (const dayMeal of diasSeleccionados) {
        // Pick a random recipe for each selected meal
        const randomRecipe = recetas[Math.floor(Math.random() * recetas.length)];
        
        // Get the correct momento UUID
        const momentoId = momentoMap.get(dayMeal.momento);
        
        if (!momentoId) {
          console.error('Unknown momento:', dayMeal.momento);
          continue;
        }
        
        console.log('Processing meal:', dayMeal, 'with recipe:', randomRecipe.nombre, 'momento ID:', momentoId);
        
        const result = await db.execute(sql`
          INSERT INTO comidas_semana (usuario_id, fecha, momento, receta_id)
          VALUES (${userId}, ${dayMeal.fecha}, ${momentoId}, ${randomRecipe.id})
          RETURNING *
        `);
        
        savedMeals.push(result.rows[0]);
      }

      res.json({
        success: true,
        planSemanal: savedMeals,
        totalComidas: savedMeals.length
      });
    } catch (error) {
      console.error("Error generating weekly meal plan:", error);
      res.status(500).json({ message: "Failed to generate weekly meal plan" });
    }
  });

  // Recipe routes
  app.get('/api/recetas', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const tagFilter = req.query.tags ? (req.query.tags as string).split(',').filter(Boolean) : [];
      
      // Get all public recipes with their tags and user ratings
      const recetasQuery = await db.execute(sql`
        SELECT 
          r.id,
          r.nombre,
          r.descripcion,
          r.imagen_url,
          r.tiempo_min,
          r.porciones_base,
          r.es_publica,
          r.usuario_id,
          r.created_at,
          COALESCE(
            JSON_AGG(
              CASE WHEN t.id IS NOT NULL 
              THEN JSON_BUILD_OBJECT('id', t.id, 'nombre', t.nombre, 'color', t.color, 'icono', t.icono)
              ELSE NULL END
            ) FILTER (WHERE t.id IS NOT NULL), 
            '[]'::json
          ) as tags,
          ur.puntaje as user_rating
        FROM recetas r
        LEFT JOIN receta_tag rt ON r.id = rt.receta_id
        LEFT JOIN tags t ON rt.tag_id = t.id
        LEFT JOIN recetas_puntaje ur ON r.id = ur.receta_id AND ur.usuario_id = ${userId}
        WHERE r.es_publica = true
        GROUP BY r.id, r.nombre, r.descripcion, r.imagen_url, r.tiempo_min, r.porciones_base, r.es_publica, r.usuario_id, r.created_at, ur.puntaje
        ORDER BY r.created_at DESC
      `);
      
      let recetasWithTags = recetasQuery.rows.map((row: any) => ({
        ...row,
        tags: Array.isArray(row.tags) ? row.tags : [],
        rating: row.user_rating || 0,
      }));
      
      // Apply tag filter if provided
      if (tagFilter.length > 0) {
        recetasWithTags = recetasWithTags.filter((receta: any) =>
          tagFilter.some((tagId: string) => 
            receta.tags.some((tag: any) => tag.id === tagId)
          )
        );
      }
      
      res.json(recetasWithTags);
    } catch (error) {
      console.error("Error fetching recetas:", error);
      res.status(500).json({ message: "Failed to fetch recetas" });
    }
  });

  // Get single recipe with full details
  app.get('/api/recetas/:id', isAuthenticated, async (req: any, res) => {
    try {
      const recetaId = req.params.id;
      
      // Get recipe basic info with user rating
      const recetaQuery = await db.execute(sql`
        SELECT r.*, ur.puntaje as user_rating
        FROM recetas r
        LEFT JOIN recetas_puntaje ur ON r.id = ur.receta_id AND ur.usuario_id = ${req.user.id}
        WHERE r.id = ${recetaId}
      `);

      if (recetaQuery.rows.length === 0) {
        return res.status(404).json({ message: "Recipe not found" });
      }

      const recipeData = recetaQuery.rows[0];

      // Get tags separately
      const tagsQuery = await db.execute(sql`
        SELECT t.id, t.nombre, t.color, t.icono
        FROM tags t
        JOIN receta_tag rt ON t.id = rt.tag_id
        WHERE rt.receta_id = ${recetaId}
      `);

      // Get ingredients separately  
      const ingredientesQuery = await db.execute(sql`
        SELECT i.id, i.nombre, ri.cantidad, ri.unidad
        FROM ingredientes i
        JOIN receta_ingredientes ri ON i.id = ri.ingrediente_id
        WHERE ri.receta_id = ${recetaId}
      `);

      res.json({
        ...recipeData,
        rating: recipeData.user_rating || 0,
        tags: tagsQuery.rows,
        ingredientes: ingredientesQuery.rows,
        // Include nutritional data
        caloriasPorPorcion: recipeData.calorias_por_porcion,
        proteinasG: recipeData.proteinas_g,
        grasasG: recipeData.grasas_g,
        carbohidratosG: recipeData.carbohidratos_g,
        fibraG: recipeData.fibra_g,
        sodioMg: recipeData.sodio_mg,
      });
    } catch (error) {
      console.error("Error fetching recipe details:", error);
      res.status(500).json({ message: "Failed to fetch recipe details" });
    }
  });

  // Placeholder image endpoint
  app.get('/api/placeholder/:width/:height', (req, res) => {
    const { width, height } = req.params;
    const svg = `
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="#f3f4f6"/>
        <rect width="60%" height="60%" x="20%" y="20%" fill="#e5e7eb" rx="8"/>
        <circle cx="40%" cy="35%" r="8%" fill="#d1d5db"/>
        <rect width="30%" height="6%" x="35%" y="55%" fill="#d1d5db" rx="3"/>
        <rect width="20%" height="4%" x="40%" y="65%" fill="#e5e7eb" rx="2"/>
      </svg>
    `;
    res.setHeader('Content-Type', 'image/svg+xml');
    res.send(svg);
  });

  // Tags routes
  app.get('/api/tags', async (req, res) => {
    try {
      const allTags = await db.select().from(tags);
      res.json(allTags);
    } catch (error) {
      console.error("Error fetching tags:", error);
      res.status(500).json({ message: "Failed to fetch tags" });
    }
  });

  // Momentos routes
  app.get('/api/momentos', async (req, res) => {
    try {
      const momentos = await db.select().from(momento);
      res.json(momentos);
    } catch (error) {
      console.error("Error fetching momentos:", error);
      res.status(500).json({ message: "Failed to fetch momentos" });
    }
  });

  // Meal planning routes
  app.get('/api/comidas-semana', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { fechaInicio, fechaFin } = req.query;
      
      // Query with proper JOIN to get recipe details and momento names
      const result = await db.execute(sql`
        SELECT 
          cs.id,
          cs.usuario_id,
          cs.fecha,
          cs.receta_id, 
          m.momento,
          r.nombre as receta_nombre,
          r.descripcion as receta_descripcion,
          r.imagen_url as receta_imagen_url,
          r.tiempo_min as receta_tiempo_min
        FROM comidas_semana cs
        LEFT JOIN recetas r ON cs.receta_id = r.id
        LEFT JOIN momento m ON cs.momento = m.id
        WHERE cs.usuario_id = '${sql.raw(userId)}'
        ORDER BY cs.fecha, m.momento
      `);
      
      let comidas = result.rows || [];
      
      // Filter by date range if provided
      if (fechaInicio || fechaFin) {
        comidas = comidas.filter((comida: any) => {
          const fecha = comida.fecha;
          if (fechaInicio && fecha < fechaInicio) return false;
          if (fechaFin && fecha > fechaFin) return false;
          return true;
        });
      }

      // Transform data to match frontend expectations
      const transformedComidas = comidas.map((comida: any) => ({
        id: comida.id,
        usuarioId: comida.usuario_id,
        fecha: comida.fecha,
        momento: comida.momento,
        recetaId: comida.receta_id,
        receta: {
          id: comida.receta_id,
          nombre: comida.receta_nombre,
          descripcion: comida.receta_descripcion,
          imagenUrl: comida.receta_imagen_url,
          tiempoMin: comida.receta_tiempo_min
        }
      }));
        
      res.json(transformedComidas);
    } catch (error) {
      console.error("Error fetching comidas semana:", error);
      res.status(500).json({ message: "Failed to fetch comidas semana" });
    }
  });

  app.post('/api/comidas-semana', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      
      // Check if user is the family chef
      const [familia] = await db
        .select()
        .from(familias)
        .where(eq(familias.chefId, userId));
        
      if (!familia) {
        return res.status(403).json({ message: "Solo el chef de la familia puede planificar comidas" });
      }
      
      const [comida] = await db
        .insert(comidasSemana)
        .values({
          usuarioId: userId,
          fecha: req.body.fecha,
          momento: req.body.momento,
          recetaId: req.body.recetaId,
        })
        .returning();
        
      res.json(comida);
    } catch (error) {
      console.error("Error planning comida:", error);
      res.status(500).json({ message: "Failed to plan comida" });
    }
  });

  // Update meal recipe
  app.put('/api/comidas-semana/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { id } = req.params;
      const { recetaId } = req.body;
      
      if (!recetaId) {
        return res.status(400).json({ message: "Recipe ID required" });
      }
      
      // Check if user is the family chef
      const [familia] = await db
        .select()
        .from(familias)
        .where(eq(familias.chefId, userId));
        
      if (!familia) {
        return res.status(403).json({ message: "Solo el chef de la familia puede editar comidas" });
      }
      
      // Update the meal
      const result = await db.execute(sql`
        UPDATE comidas_semana 
        SET receta_id = ${recetaId}
        WHERE id = ${id} AND usuario_id = ${userId}
        RETURNING *
      `);
      
      if (result.rows.length === 0) {
        return res.status(404).json({ message: "Meal not found" });
      }
      
      res.json(result.rows[0]);
    } catch (error) {
      console.error("Error updating meal:", error);
      res.status(500).json({ message: "Failed to update meal" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}