import type { Express } from "express";
import { createServer, type Server } from "http";
import session from "express-session";
import { storage } from "./storage";
import { seedDatabase } from "./seed";
import bcrypt from "bcryptjs";
import pgSession from "connect-pg-simple";
import {
  insertUserSchema, insertEventSchema, insertAnnouncementSchema,
  insertDepartmentSchema, insertAbsenceSchema, insertRewardSchema,
  insertApplicationSchema, insertAppAccessSchema,
} from "@shared/schema";

const PgStore = pgSession(session);

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  app.use(
    session({
      store: new PgStore({
        conString: process.env.DATABASE_URL,
        createTableIfMissing: true,
      }),
      secret: process.env.SESSION_SECRET || "kantoor-dashboard-secret",
      resave: false,
      saveUninitialized: false,
      cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 },
    })
  );

  await seedDatabase();

  function requireAuth(req: any, res: any, next: any) {
    if (!(req.session as any).userId) {
      return res.status(401).json({ message: "Niet ingelogd" });
    }
    next();
  }

  async function requireAdmin(req: any, res: any, next: any) {
    const userId = (req.session as any).userId;
    if (!userId) return res.status(401).json({ message: "Niet ingelogd" });
    const user = await storage.getUser(userId);
    if (!user || user.role !== "admin") {
      return res.status(403).json({ message: "Geen toegang - alleen beheerders" });
    }
    next();
  }

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      if (!username || !password) {
        return res.status(400).json({ message: "Gebruikersnaam en wachtwoord zijn verplicht" });
      }
      const user = await storage.getUserByUsername(username);
      if (!user) {
        return res.status(401).json({ message: "Ongeldige inloggegevens" });
      }
      const valid = await bcrypt.compare(password, user.password);
      if (!valid) {
        return res.status(401).json({ message: "Ongeldige inloggegevens" });
      }
      (req.session as any).userId = user.id;
      const { password: _, ...safeUser } = user;
      res.json(safeUser);
    } catch (err) {
      res.status(500).json({ message: "Serverfout" });
    }
  });

  app.get("/api/auth/me", async (req, res) => {
    const userId = (req.session as any).userId;
    if (!userId) return res.status(401).json({ message: "Niet ingelogd" });
    const user = await storage.getUser(userId);
    if (!user) return res.status(401).json({ message: "Gebruiker niet gevonden" });
    const { password: _, ...safeUser } = user;
    res.json(safeUser);
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy(() => {
      res.json({ message: "Uitgelogd" });
    });
  });

  app.get("/api/dashboard/stats", requireAuth, async (_req, res) => {
    const stats = await storage.getDashboardStats();
    res.json(stats);
  });

  app.get("/api/users", requireAuth, async (_req, res) => {
    const allUsers = await storage.getUsers();
    res.json(allUsers.map(({ password: _, ...u }) => u));
  });

  app.post("/api/users", requireAdmin, async (req, res) => {
    try {
      const parsed = insertUserSchema.parse(req.body);
      const hashed = await bcrypt.hash(parsed.password, 10);
      const user = await storage.createUser({ ...parsed, password: hashed });
      const { password: _, ...safeUser } = user;
      res.json(safeUser);
    } catch (err: any) {
      res.status(400).json({ message: err.message || "Validatiefout" });
    }
  });

  app.patch("/api/users/:id", requireAdmin, async (req, res) => {
    try {
      const data = { ...req.body };
      if (data.password) {
        data.password = await bcrypt.hash(data.password, 10);
      }
      const user = await storage.updateUser(req.params.id, data);
      const { password: _, ...safeUser } = user;
      res.json(safeUser);
    } catch (err: any) {
      res.status(400).json({ message: err.message || "Bijwerken mislukt" });
    }
  });

  app.patch("/api/users/:id/permissions", requireAdmin, async (req, res) => {
    try {
      const { permissions } = req.body;
      if (!Array.isArray(permissions)) {
        return res.status(400).json({ message: "Ongeldige rechten" });
      }
      const user = await storage.updateUserPermissions(req.params.id, permissions);
      const { password: _, ...safeUser } = user;
      res.json(safeUser);
    } catch (err: any) {
      res.status(400).json({ message: err.message || "Bijwerken mislukt" });
    }
  });

  app.delete("/api/users/:id", requireAdmin, async (req, res) => {
    await storage.deleteUser(req.params.id);
    res.json({ message: "Verwijderd" });
  });

  app.get("/api/events", requireAuth, async (_req, res) => {
    const all = await storage.getEvents();
    res.json(all);
  });

  app.post("/api/events", requireAuth, async (req, res) => {
    try {
      const parsed = insertEventSchema.parse(req.body);
      const event = await storage.createEvent(parsed);
      res.json(event);
    } catch (err: any) {
      res.status(400).json({ message: err.message || "Validatiefout" });
    }
  });

  app.patch("/api/events/:id", requireAuth, async (req, res) => {
    try {
      const event = await storage.updateEvent(req.params.id, req.body);
      res.json(event);
    } catch (err: any) {
      res.status(400).json({ message: err.message || "Bijwerken mislukt" });
    }
  });

  app.delete("/api/events/:id", requireAuth, async (req, res) => {
    await storage.deleteEvent(req.params.id);
    res.json({ message: "Verwijderd" });
  });

  app.get("/api/announcements", requireAuth, async (_req, res) => {
    const all = await storage.getAnnouncements();
    res.json(all);
  });

  app.post("/api/announcements", requireAuth, async (req, res) => {
    try {
      const parsed = insertAnnouncementSchema.parse(req.body);
      const ann = await storage.createAnnouncement(parsed);
      res.json(ann);
    } catch (err: any) {
      res.status(400).json({ message: err.message || "Validatiefout" });
    }
  });

  app.patch("/api/announcements/:id", requireAuth, async (req, res) => {
    try {
      const ann = await storage.updateAnnouncement(req.params.id, req.body);
      res.json(ann);
    } catch (err: any) {
      res.status(400).json({ message: err.message || "Bijwerken mislukt" });
    }
  });

  app.delete("/api/announcements/:id", requireAuth, async (req, res) => {
    await storage.deleteAnnouncement(req.params.id);
    res.json({ message: "Verwijderd" });
  });

  app.get("/api/departments", requireAuth, async (_req, res) => {
    const all = await storage.getDepartments();
    res.json(all);
  });

  app.post("/api/departments", requireAuth, async (req, res) => {
    try {
      const parsed = insertDepartmentSchema.parse(req.body);
      const dept = await storage.createDepartment(parsed);
      res.json(dept);
    } catch (err: any) {
      res.status(400).json({ message: err.message || "Validatiefout" });
    }
  });

  app.patch("/api/departments/:id", requireAuth, async (req, res) => {
    try {
      const dept = await storage.updateDepartment(req.params.id, req.body);
      res.json(dept);
    } catch (err: any) {
      res.status(400).json({ message: err.message || "Bijwerken mislukt" });
    }
  });

  app.delete("/api/departments/:id", requireAuth, async (req, res) => {
    await storage.deleteDepartment(req.params.id);
    res.json({ message: "Verwijderd" });
  });

  app.get("/api/absences", requireAuth, async (_req, res) => {
    const all = await storage.getAbsences();
    res.json(all);
  });

  app.get("/api/absences/mine", requireAuth, async (req, res) => {
    const userId = (req.session as any).userId;
    const mine = await storage.getAbsencesByUser(userId);
    res.json(mine);
  });

  app.post("/api/absences", requireAuth, async (req, res) => {
    try {
      const parsed = insertAbsenceSchema.parse(req.body);
      const absence = await storage.createAbsence(parsed);
      res.json(absence);
    } catch (err: any) {
      res.status(400).json({ message: err.message || "Validatiefout" });
    }
  });

  app.patch("/api/absences/:id", requireAuth, async (req, res) => {
    try {
      await storage.updateAbsenceStatus(req.params.id, req.body.status, req.body.approvedBy);
      res.json({ message: "Bijgewerkt" });
    } catch (err: any) {
      res.status(400).json({ message: err.message || "Bijwerken mislukt" });
    }
  });

  app.get("/api/rewards", requireAuth, async (_req, res) => {
    const all = await storage.getRewards();
    res.json(all);
  });

  app.get("/api/rewards/mine", requireAuth, async (req, res) => {
    const userId = (req.session as any).userId;
    const mine = await storage.getRewardsByUser(userId);
    res.json(mine);
  });

  app.post("/api/rewards", requireAuth, async (req, res) => {
    try {
      const parsed = insertRewardSchema.parse(req.body);
      const reward = await storage.createReward(parsed);
      res.json(reward);
    } catch (err: any) {
      res.status(400).json({ message: err.message || "Validatiefout" });
    }
  });

  app.get("/api/rewards/leaderboard", requireAuth, async (_req, res) => {
    const lb = await storage.getLeaderboard();
    res.json(lb);
  });

  app.get("/api/applications", requireAuth, async (_req, res) => {
    const all = await storage.getApplications();
    res.json(all);
  });

  app.post("/api/applications", requireAuth, async (req, res) => {
    try {
      const parsed = insertApplicationSchema.parse(req.body);
      const app2 = await storage.createApplication(parsed);
      res.json(app2);
    } catch (err: any) {
      res.status(400).json({ message: err.message || "Validatiefout" });
    }
  });

  app.patch("/api/applications/:id", requireAuth, async (req, res) => {
    try {
      const app2 = await storage.updateApplication(req.params.id, req.body);
      res.json(app2);
    } catch (err: any) {
      res.status(400).json({ message: err.message || "Bijwerken mislukt" });
    }
  });

  app.delete("/api/applications/:id", requireAuth, async (req, res) => {
    await storage.deleteApplication(req.params.id);
    res.json({ message: "Verwijderd" });
  });

  app.get("/api/app-access", requireAuth, async (_req, res) => {
    const all = await storage.getAppAccess();
    res.json(all);
  });

  app.post("/api/app-access", requireAuth, async (req, res) => {
    try {
      const parsed = insertAppAccessSchema.parse(req.body);
      const access = await storage.createAppAccess(parsed);
      res.json(access);
    } catch (err: any) {
      res.status(400).json({ message: err.message || "Validatiefout" });
    }
  });

  app.delete("/api/app-access/:id", requireAuth, async (req, res) => {
    await storage.deleteAppAccess(req.params.id);
    res.json({ message: "Verwijderd" });
  });

  return httpServer;
}
