import type { Express } from "express";
import { createServer, type Server } from "http";
import { simpleStorage as storage } from "./storage-simple";
import { setupAuth, isAuthenticated } from "./auth-simple";
import { 
  insertFamiliaSchema, 
  insertMiembroFamiliaSchema,
  insertRecetaSchema,
  insertRecetaPuntajeSchema,
  insertComidaSemanaSchema,
  insertRecetaFavoritaSchema 
} from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      
      // Get user's family info if they have one
      let familia = null;
      if (user.familiaId) {
        familia = await storage.getFamiliaByUsuario(user.id);
      }
      
      res.json({ ...user, familia });
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // User status routes
  app.get('/api/user/is-chef', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const isChef = await storage.isUserFamilyChef(userId);
      res.json({ isChef });
    } catch (error) {
      console.error("Error checking chef status:", error);
      res.status(500).json({ message: "Failed to check chef status" });
    }
  });

  // Family routes
  app.post('/api/familias', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const familiaData = insertFamiliaSchema.parse({
        ...req.body,
        chefId: userId, // Set the creator as the family chef
      });
      
      const familia = await storage.createFamilia(familiaData);
      
      // Add creator as admin member
      await storage.addMiembroFamilia({
        familiaId: familia.id,
        usuarioId: userId,
        nombre: req.user.firstName || 'Usuario',
        apellido: req.user.lastName || '',
        email: req.user.email,
        esAdmin: true,
      });
      
      res.json(familia);
    } catch (error) {
      console.error("Error creating familia:", error);
      res.status(500).json({ message: "Failed to create familia" });
    }
  });

  app.post('/api/familias/join', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { codigoInvitacion } = req.body;
      
      const familia = await storage.getFamiliaByCodigoInvitacion(codigoInvitacion);
      if (!familia) {
        return res.status(404).json({ message: "Código de invitación inválido" });
      }
      
      await storage.addMiembroFamilia({
        familiaId: familia.id,
        usuarioId: userId,
        nombre: req.user.claims.first_name || 'Usuario',
        apellido: req.user.claims.last_name || '',
        email: req.user.claims.email,
        esAdmin: false,
      });
      
      res.json(familia);
    } catch (error) {
      console.error("Error joining familia:", error);
      res.status(500).json({ message: "Failed to join familia" });
    }
  });

  app.get('/api/familias/miembros', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const familia = await storage.getFamiliaByUsuario(userId);
      
      if (!familia) {
        return res.status(404).json({ message: "User not in a family" });
      }
      
      const miembros = await storage.getMiembrosFamilia(familia.id);
      res.json(miembros);
    } catch (error) {
      console.error("Error fetching family members:", error);
      res.status(500).json({ message: "Failed to fetch family members" });
    }
  });

  // Recipe routes
  app.get('/api/recetas', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const tags = req.query.tags ? (req.query.tags as string).split(',') : undefined;
      
      const recetas = await storage.getRecetas(userId, tags);
      res.json(recetas);
    } catch (error) {
      console.error("Error fetching recetas:", error);
      res.status(500).json({ message: "Failed to fetch recetas" });
    }
  });

  app.get('/api/recetas/:id', isAuthenticated, async (req: any, res) => {
    try {
      const receta = await storage.getRecetaById(req.params.id);
      if (!receta) {
        return res.status(404).json({ message: "Recipe not found" });
      }
      res.json(receta);
    } catch (error) {
      console.error("Error fetching receta:", error);
      res.status(500).json({ message: "Failed to fetch receta" });
    }
  });

  app.post('/api/recetas', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const recetaData = insertRecetaSchema.parse({
        ...req.body,
        usuarioId: userId,
      });
      
      const receta = await storage.createReceta(recetaData);
      res.json(receta);
    } catch (error) {
      console.error("Error creating receta:", error);
      res.status(500).json({ message: "Failed to create receta" });
    }
  });

  app.get('/api/recetas/favoritas', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const favoritas = await storage.getRecetasFavoritas(userId);
      res.json(favoritas);
    } catch (error) {
      console.error("Error fetching favoritas:", error);
      res.status(500).json({ message: "Failed to fetch favoritas" });
    }
  });

  app.post('/api/recetas/:id/favorita', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      await storage.toggleRecetaFavorita({
        usuarioId: userId,
        recetaId: req.params.id,
      });
      res.json({ success: true });
    } catch (error) {
      console.error("Error toggling favorita:", error);
      res.status(500).json({ message: "Failed to toggle favorita" });
    }
  });

  app.post('/api/recetas/:id/rating', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const ratingData = insertRecetaPuntajeSchema.parse({
        usuarioId: userId,
        recetaId: req.params.id,
        puntaje: req.body.puntaje,
      });
      
      const rating = await storage.rateReceta(ratingData);
      res.json(rating);
    } catch (error) {
      console.error("Error rating receta:", error);
      res.status(500).json({ message: "Failed to rate receta" });
    }
  });

  // Meal planning routes
  app.get('/api/comidas-semana', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { fechaInicio, fechaFin } = req.query;
      
      if (!fechaInicio || !fechaFin) {
        return res.status(400).json({ message: "fechaInicio and fechaFin are required" });
      }
      
      const comidas = await storage.getComidasSemana(userId, fechaInicio as string, fechaFin as string);
      res.json(comidas);
    } catch (error) {
      console.error("Error fetching comidas semana:", error);
      res.status(500).json({ message: "Failed to fetch comidas semana" });
    }
  });

  app.post('/api/comidas-semana', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      
      // Check if user is the family chef
      const isChef = await storage.isUserFamilyChef(userId);
      if (!isChef) {
        return res.status(403).json({ message: "Solo el chef de la familia puede planificar comidas" });
      }
      
      const comidaData = insertComidaSemanaSchema.parse({
        ...req.body,
        usuarioId: userId,
      });
      
      const comida = await storage.planearComida(comidaData);
      res.json(comida);
    } catch (error) {
      console.error("Error planning comida:", error);
      res.status(500).json({ message: "Failed to plan comida" });
    }
  });

  app.delete('/api/comidas-semana/:id', isAuthenticated, async (req: any, res) => {
    try {
      await storage.eliminarComidaSemana(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting comida:", error);
      res.status(500).json({ message: "Failed to delete comida" });
    }
  });

  // Tags
  app.get('/api/tags', async (req, res) => {
    try {
      const tags = await storage.getTags();
      res.json(tags);
    } catch (error) {
      console.error("Error fetching tags:", error);
      res.status(500).json({ message: "Failed to fetch tags" });
    }
  });

  // Grocery list
  app.get('/api/grocery-list', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { fechaInicio, fechaFin } = req.query;
      
      if (!fechaInicio || !fechaFin) {
        return res.status(400).json({ message: "fechaInicio and fechaFin are required" });
      }
      
      const ingredientes = await storage.getIngredientesParaSemana(
        userId, 
        fechaInicio as string, 
        fechaFin as string
      );
      res.json(ingredientes);
    } catch (error) {
      console.error("Error fetching grocery list:", error);
      res.status(500).json({ message: "Failed to fetch grocery list" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
