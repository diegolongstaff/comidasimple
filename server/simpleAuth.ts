import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import connectPg from "connect-pg-simple";
import { db } from "./db";
import { usuarios } from "@shared/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcrypt";

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  return session({
    secret: process.env.SESSION_SECRET!,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: false, // Set to false for development
      maxAge: sessionTtl,
    },
  });
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  // Local Strategy for email/password
  passport.use(new LocalStrategy({
    usernameField: 'email',
    passwordField: 'password'
  }, async (email, password, done) => {
    try {
      const [user] = await db.select().from(usuarios).where(eq(usuarios.email, email));
      if (!user || !user.passwordHash) {
        return done(null, false, { message: 'Email o contraseña incorrectos' });
      }
      
      const isValidPassword = await bcrypt.compare(password, user.passwordHash);
      if (!isValidPassword) {
        return done(null, false, { message: 'Email o contraseña incorrectos' });
      }
      
      return done(null, user);
    } catch (error) {
      return done(error);
    }
  }));

  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: string, done) => {
    try {
      const [user] = await db.select().from(usuarios).where(eq(usuarios.id, id));
      done(null, user);
    } catch (error) {
      done(error, null);
    }
  });

  // Registration route
  app.post('/api/auth/register', async (req, res) => {
    try {
      const { email, password, firstName, lastName } = req.body;
      
      // Check if user already exists
      const [existingUser] = await db.select().from(usuarios).where(eq(usuarios.email, email));
      if (existingUser) {
        return res.status(400).json({ message: 'El usuario ya existe' });
      }
      
      // Hash password
      const passwordHash = await bcrypt.hash(password, 10);
      
      // Create user
      const [user] = await db
        .insert(usuarios)
        .values({
          email,
          passwordHash,
          nombre: firstName,
          apellido: lastName,
        })
        .returning();
      
      // Log in user
      req.login(user, (err) => {
        if (err) {
          console.error('Login error after registration:', err);
          return res.status(500).json({ message: 'Error al iniciar sesión' });
        }
        return res.json({ user, message: 'Cuenta creada exitosamente' });
      });
    } catch (error) {
      console.error('Registration error:', error);
      if (!res.headersSent) {
        res.status(500).json({ message: 'Error al crear la cuenta' });
      }
    }
  });

  // Login route
  app.post('/api/auth/login',
    passport.authenticate('local', { session: true }),
    (req, res) => {
      res.json({ user: req.user, message: 'Inicio de sesión exitoso' });
    }
  );

  // Logout route
  app.post('/api/auth/logout', (req, res) => {
    req.logout((err) => {
      if (err) {
        return res.status(500).json({ message: 'Error al cerrar sesión' });
      }
      res.json({ message: 'Sesión cerrada exitosamente' });
    });
  });
}

export const isAuthenticated: RequestHandler = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: "Unauthorized" });
};