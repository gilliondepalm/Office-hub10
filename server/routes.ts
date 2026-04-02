import type { Express } from "express";
import { createServer, type Server } from "http";
import session from "express-session";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import { storage } from "./storage";
import { seedDatabase } from "./seed";
import bcrypt from "bcryptjs";
import pgSession from "connect-pg-simple";
import multer from "multer";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import {
  insertUserSchema, insertEventSchema, insertAnnouncementSchema,
  insertDepartmentSchema, insertAbsenceSchema, insertRewardSchema,
  insertApplicationSchema, insertAppAccessSchema, insertMessageSchema,
  insertAoProcedureSchema, insertAoInstructionSchema, insertPositionHistorySchema,
  insertPersonalDevelopmentSchema, insertLegislationLinkSchema, insertCaoDocumentSchema,
  insertFunctioneringReviewSchema,
  insertCompetencySchema, insertBeoordelingReviewSchema, insertBeoordelingScoreSchema,
  insertJaarplanItemSchema,
  insertHelpContentSchema,
  insertYearlyAwardSchema,
  insertKartografieProductieSchema,
  insertMaandProdKartograafSchema,
  insertMaandProdSamenvattingSchema,
  insertMaandProdLandmeterSchema,
  insertMaandProdSamenvattingLmSchema,
  insertTrendKmBuitenSchema,
  insertTrendKmInfoSchema,
  insertTrendOrInfoSchema,
  insertTrendOrAlgemeenSchema,
  insertTrendOrNotarisSchema,
  insertTrendKartografenHistSchema,
  isAdminRole,
  canManageVacation,
} from "@shared/schema";

const PgStore = pgSession(session);

const uploadsDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const aankondigingenDir = path.join(uploadsDir, "Aankondigingen");
if (!fs.existsSync(aankondigingenDir)) {
  fs.mkdirSync(aankondigingenDir, { recursive: true });
}

const pdfStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, aankondigingenDir),
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + "-" + file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_"));
  },
});

const uploadPdf = multer({
  storage: pdfStorage,
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === "application/pdf") {
      cb(null, true);
    } else {
      cb(new Error("Alleen PDF-bestanden zijn toegestaan"));
    }
  },
  limits: { fileSize: 10 * 1024 * 1024 },
});

const beloningDir = path.join(uploadsDir, "Beloning");
if (!fs.existsSync(beloningDir)) {
  fs.mkdirSync(beloningDir, { recursive: true });
}

const functiesDir = path.join(uploadsDir, "Functies");
if (!fs.existsSync(functiesDir)) {
  fs.mkdirSync(functiesDir, { recursive: true });
}

const functiesStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, functiesDir),
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + "-" + file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_"));
  },
});

const uploadFunctie = multer({
  storage: functiesStorage,
  fileFilter: (_req, file, cb) => {
    const allowed = ["application/pdf", "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "text/plain"];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Alleen PDF, Word of tekstbestanden zijn toegestaan"));
    }
  },
  limits: { fileSize: 20 * 1024 * 1024 },
});

const beloningStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, beloningDir),
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + "-" + file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_"));
  },
});

const uploadBeloning = multer({
  storage: beloningStorage,
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Alleen afbeeldingen zijn toegestaan"));
    }
  },
  limits: { fileSize: 10 * 1024 * 1024 },
});

const pasfotoDir = path.join(uploadsDir, "Pasfoto");
if (!fs.existsSync(pasfotoDir)) {
  fs.mkdirSync(pasfotoDir, { recursive: true });
}

const huishoudelijkDir = path.join(uploadsDir, "Huishoudelijkreglement");
if (!fs.existsSync(huishoudelijkDir)) {
  fs.mkdirSync(huishoudelijkDir, { recursive: true });
}

const pasfotoStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, pasfotoDir),
  filename: (req: any, file, cb) => {
    const ext = path.extname(file.originalname) || ".jpg";
    cb(null, `user-${req.params?.id || Date.now()}${ext}`);
  },
});

const uploadPasfoto = multer({
  storage: pasfotoStorage,
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) { cb(null, true); }
    else { cb(new Error("Alleen afbeeldingen zijn toegestaan")); }
  },
  limits: { fileSize: 20 * 1024 * 1024 },
});

const appPicsDir = path.join(uploadsDir, "App_pics");
if (!fs.existsSync(appPicsDir)) {
  fs.mkdirSync(appPicsDir, { recursive: true });
}

const imageStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, appPicsDir),
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + "-" + file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_"));
  },
});

const uploadImage = multer({
  storage: imageStorage,
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Alleen afbeeldingen zijn toegestaan"));
    }
  },
  limits: { fileSize: 10 * 1024 * 1024 },
});

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  const isProduction = process.env.NODE_ENV === "production";
  const sessionSecret = process.env.SESSION_SECRET || crypto.randomBytes(32).toString("hex");
  if (!process.env.SESSION_SECRET) {
    console.warn("[SECURITY] SESSION_SECRET is niet ingesteld. Een tijdelijke sleutel wordt gebruikt. Stel SESSION_SECRET in als omgevingsvariabele voor productie.");
  }

  app.use(
    session({
      store: new PgStore({
        conString: process.env.DATABASE_URL,
        createTableIfMissing: true,
      }),
      secret: sessionSecret,
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: isProduction,
        httpOnly: true,
        sameSite: "lax",
        maxAge: 24 * 60 * 60 * 1000,
      },
    })
  );

  app.set("trust proxy", 1);

  const keyGenerator = (req: any) => {
    const raw = req.ip || req.socket.remoteAddress || "unknown";
    const ip = raw.replace(/:\d+$/, "").replace(/^::ffff:/, "");
    return ipKeyGenerator(ip);
  };

  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: { message: "Te veel pogingen. Probeer het over 15 minuten opnieuw." },
    standardHeaders: true,
    legacyHeaders: false,
    validate: { xForwardedForHeader: false },
    keyGenerator,
  });

  const apiLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 100,
    message: { message: "Te veel verzoeken. Probeer het later opnieuw." },
    standardHeaders: true,
    legacyHeaders: false,
    validate: { xForwardedForHeader: false },
    keyGenerator,
  });

  app.use("/api/", apiLimiter);

  await seedDatabase();

  async function requireAuth(req: any, res: any, next: any) {
    const userId = (req.session as any).userId;
    if (!userId) {
      return res.status(401).json({ message: "Niet ingelogd" });
    }
    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(401).json({ message: "Niet ingelogd" });
    }
    req.user = user;
    next();
  }

  async function requireAdmin(req: any, res: any, next: any) {
    const userId = (req.session as any).userId;
    if (!userId) return res.status(401).json({ message: "Niet ingelogd" });
    const user = await storage.getUser(userId);
    if (!user || !isAdminRole(user.role)) {
      return res.status(403).json({ message: "Geen toegang - alleen beheerders" });
    }
    next();
  }

  async function requirePersonaliaAdmin(req: any, res: any, next: any) {
    const userId = (req.session as any).userId;
    if (!userId) return res.status(401).json({ message: "Niet ingelogd" });
    const user = await storage.getUser(userId);
    if (!user || (!isAdminRole(user.role) && user.role !== "manager_az")) {
      return res.status(403).json({ message: "Geen toegang - alleen beheerders" });
    }
    req.user = user;
    next();
  }

  const express = await import("express");

  app.use("/PDF", express.default.static(path.join(process.cwd(), "PDF")));

  app.use("/uploads/App_pics", express.default.static(appPicsDir));
  app.use("/uploads/Beloning", express.default.static(beloningDir));
  app.use("/uploads/Functies", express.default.static(functiesDir));
  app.use("/uploads/Pasfoto", express.default.static(pasfotoDir));
  app.use("/uploads/Huishoudelijkreglement", express.default.static(huishoudelijkDir));

  app.get("/uploads/public/:filename", (req, res) => {
    const filename = req.params.filename.replace(/[^a-zA-Z0-9._-]/g, "");
    const filePath = path.join(uploadsDir, filename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: "Bestand niet gevonden" });
    }
    res.sendFile(filePath);
  });

  app.use("/uploads", requireAuth, (req, res, next) => {
    if (req.path.endsWith(".pdf")) {
      const filePath = path.join(uploadsDir, req.path);
      if (fs.existsSync(filePath)) {
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", "inline");
        res.setHeader("X-Frame-Options", "SAMEORIGIN");
        res.setHeader("Content-Security-Policy", "frame-ancestors 'self'");
        return res.sendFile(filePath);
      }
    }
    next();
  }, express.default.static(uploadsDir));

  app.post("/api/upload/pdf", requireAuth, uploadPdf.single("pdf"), (req: any, res) => {
    if (!req.file) {
      return res.status(400).json({ message: "Geen PDF-bestand ontvangen" });
    }
    const pdfUrl = `/uploads/Aankondigingen/${req.file.filename}`;
    res.json({ pdfUrl });
  });

  const wetgevingDir = path.join(uploadsDir, "Wetgeving");
  if (!fs.existsSync(wetgevingDir)) {
    fs.mkdirSync(wetgevingDir, { recursive: true });
  }

  app.get("/api/uploads/list", requireAuth, (_req, res) => {
    try {
      const files = fs.readdirSync(uploadsDir)
        .filter((f: string) => f.toLowerCase().endsWith(".pdf"))
        .map((f: string) => {
          const stat = fs.statSync(path.join(uploadsDir, f));
          return { name: f, path: `/uploads/${f}`, size: stat.size, modified: stat.mtime };
        })
        .sort((a: any, b: any) => new Date(b.modified).getTime() - new Date(a.modified).getTime());
      res.json(files);
    } catch {
      res.json([]);
    }
  });

  app.get("/api/uploads/wetgeving", requireAuth, (_req, res) => {
    try {
      const files = fs.readdirSync(wetgevingDir)
        .filter((f: string) => f.toLowerCase().endsWith(".pdf"))
        .map((f: string) => {
          const stat = fs.statSync(path.join(wetgevingDir, f));
          return { name: f, path: `/uploads/Wetgeving/${f}`, size: stat.size, modified: stat.mtime };
        })
        .sort((a: any, b: any) => a.name.localeCompare(b.name));
      res.json(files);
    } catch {
      res.json([]);
    }
  });

  const wetgevingUpload = multer({
    storage: multer.diskStorage({
      destination: (_req: any, _file: any, cb: any) => cb(null, wetgevingDir),
      filename: (_req: any, file: any, cb: any) => cb(null, file.originalname),
    }),
    fileFilter: (_req: any, file: any, cb: any) => {
      if (file.mimetype === "application/pdf") cb(null, true);
      else cb(new Error("Alleen PDF-bestanden"));
    },
  });

  app.post("/api/uploads/wetgeving", requireAuth, wetgevingUpload.single("pdf"), async (req: any, res) => {
    const userId = (req.session as any).userId;
    const user = await storage.getUser(userId);
    if (!user || !isAdminRole(user.role)) {
      return res.status(403).json({ message: "Alleen beheerders" });
    }
    if (!req.file) {
      return res.status(400).json({ message: "Geen PDF-bestand ontvangen" });
    }
    res.json({ name: req.file.originalname, path: `/uploads/Wetgeving/${req.file.originalname}` });
  });

  const caoDir = path.join(uploadsDir, "CAO");
  if (!fs.existsSync(caoDir)) {
    fs.mkdirSync(caoDir, { recursive: true });
  }

  app.get("/api/uploads/cao", requireAuth, (_req, res) => {
    try {
      const files = fs.readdirSync(caoDir)
        .filter((f: string) => f.toLowerCase().endsWith(".pdf"))
        .map((f: string) => {
          const stat = fs.statSync(path.join(caoDir, f));
          return { name: f, path: `/uploads/CAO/${f}`, size: stat.size, modified: stat.mtime };
        })
        .sort((a: any, b: any) => a.name.localeCompare(b.name));
      res.json(files);
    } catch {
      res.json([]);
    }
  });

  const caoUpload = multer({
    storage: multer.diskStorage({
      destination: (_req: any, _file: any, cb: any) => cb(null, caoDir),
      filename: (_req: any, file: any, cb: any) => cb(null, file.originalname),
    }),
    fileFilter: (_req: any, file: any, cb: any) => {
      if (file.mimetype === "application/pdf") cb(null, true);
      else cb(new Error("Alleen PDF-bestanden"));
    },
  });

  app.post("/api/uploads/cao", requireAuth, caoUpload.single("pdf"), async (req: any, res) => {
    const userId = (req.session as any).userId;
    const user = await storage.getUser(userId);
    if (!user || !isAdminRole(user.role)) {
      return res.status(403).json({ message: "Alleen beheerders" });
    }
    if (!req.file) {
      return res.status(400).json({ message: "Geen PDF-bestand ontvangen" });
    }
    res.json({ name: req.file.originalname, path: `/uploads/CAO/${req.file.originalname}` });
  });

  app.delete("/api/uploads/cao/:filename", requireAuth, async (req: any, res) => {
    const userId = (req.session as any).userId;
    const user = await storage.getUser(userId);
    if (!user || !isAdminRole(user.role)) {
      return res.status(403).json({ message: "Alleen beheerders" });
    }
    const filename = req.params.filename.replace(/[^a-zA-Z0-9._\- ]/g, "");
    const filePath = path.join(caoDir, filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      res.json({ message: "Verwijderd" });
    } else {
      res.status(404).json({ message: "Bestand niet gevonden" });
    }
  });

  app.delete("/api/uploads/wetgeving/:filename", requireAuth, async (req: any, res) => {
    const userId = (req.session as any).userId;
    const user = await storage.getUser(userId);
    if (!user || !isAdminRole(user.role)) {
      return res.status(403).json({ message: "Alleen beheerders" });
    }
    const filename = req.params.filename.replace(/[^a-zA-Z0-9._\- ]/g, "");
    const filePath = path.join(wetgevingDir, filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      res.json({ message: "Verwijderd" });
    } else {
      res.status(404).json({ message: "Bestand niet gevonden" });
    }
  });

  app.get("/api/uploads/huishoudelijkreglement", requireAuth, (_req, res) => {
    try {
      const files = fs.readdirSync(huishoudelijkDir)
        .filter((f: string) => f.toLowerCase().endsWith(".pdf"))
        .map((f: string) => {
          const stat = fs.statSync(path.join(huishoudelijkDir, f));
          return { name: f, path: `/uploads/Huishoudelijkreglement/${f}`, size: stat.size, modified: stat.mtime };
        })
        .sort((a: any, b: any) => a.name.localeCompare(b.name));
      res.json(files);
    } catch {
      res.json([]);
    }
  });

  const huishoudelijkUpload = multer({
    storage: multer.diskStorage({
      destination: (_req: any, _file: any, cb: any) => cb(null, huishoudelijkDir),
      filename: (_req: any, file: any, cb: any) => cb(null, file.originalname),
    }),
    fileFilter: (_req: any, file: any, cb: any) => {
      if (file.mimetype === "application/pdf") cb(null, true);
      else cb(new Error("Alleen PDF-bestanden"));
    },
  });

  app.post("/api/uploads/huishoudelijkreglement", requireAuth, huishoudelijkUpload.single("pdf"), async (req: any, res) => {
    const userId = (req.session as any).userId;
    const user = await storage.getUser(userId);
    if (!user || !isAdminRole(user.role)) {
      return res.status(403).json({ message: "Alleen beheerders" });
    }
    if (!req.file) {
      return res.status(400).json({ message: "Geen PDF-bestand ontvangen" });
    }
    res.json({ name: req.file.originalname, path: `/uploads/Huishoudelijkreglement/${req.file.originalname}` });
  });

  app.delete("/api/uploads/huishoudelijkreglement/:filename", requireAuth, async (req: any, res) => {
    const userId = (req.session as any).userId;
    const user = await storage.getUser(userId);
    if (!user || !isAdminRole(user.role)) {
      return res.status(403).json({ message: "Alleen beheerders" });
    }
    const filename = req.params.filename.replace(/[^a-zA-Z0-9._\- ]/g, "");
    const filePath = path.join(huishoudelijkDir, filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      res.json({ message: "Verwijderd" });
    } else {
      res.status(404).json({ message: "Bestand niet gevonden" });
    }
  });

  const nieuwsbriefDir = path.join(uploadsDir, "Nieuwsbrief");
  if (!fs.existsSync(nieuwsbriefDir)) {
    fs.mkdirSync(nieuwsbriefDir, { recursive: true });
  }

  app.get("/api/uploads/nieuwsbrief", requireAuth, (_req, res) => {
    try {
      const files = fs.readdirSync(nieuwsbriefDir)
        .filter((f: string) => f.toLowerCase().endsWith(".pdf"))
        .map((f: string) => {
          const stat = fs.statSync(path.join(nieuwsbriefDir, f));
          return { name: f, path: `/uploads/Nieuwsbrief/${f}`, size: stat.size, modified: stat.mtime };
        })
        .sort((a: any, b: any) => a.name.localeCompare(b.name));
      res.json(files);
    } catch {
      res.json([]);
    }
  });

  const nieuwsbriefUpload = multer({
    storage: multer.diskStorage({
      destination: (_req: any, _file: any, cb: any) => cb(null, nieuwsbriefDir),
      filename: (_req: any, file: any, cb: any) => cb(null, file.originalname),
    }),
    fileFilter: (_req: any, file: any, cb: any) => {
      if (file.mimetype === "application/pdf") cb(null, true);
      else cb(new Error("Alleen PDF-bestanden"));
    },
  });

  app.post("/api/uploads/nieuwsbrief", requireAuth, nieuwsbriefUpload.single("pdf"), async (req: any, res) => {
    const userId = (req.session as any).userId;
    const user = await storage.getUser(userId);
    if (!user || !isAdminRole(user.role)) {
      return res.status(403).json({ message: "Alleen beheerders" });
    }
    if (!req.file) {
      return res.status(400).json({ message: "Geen PDF-bestand ontvangen" });
    }
    res.json({ name: req.file.originalname, path: `/uploads/Nieuwsbrief/${req.file.originalname}` });
  });

  app.delete("/api/uploads/nieuwsbrief/:filename", requireAuth, async (req: any, res) => {
    const userId = (req.session as any).userId;
    const user = await storage.getUser(userId);
    if (!user || !isAdminRole(user.role)) {
      return res.status(403).json({ message: "Alleen beheerders" });
    }
    const filename = req.params.filename.replace(/[^a-zA-Z0-9._\- ]/g, "");
    const filePath = path.join(nieuwsbriefDir, filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      res.json({ message: "Verwijderd" });
    } else {
      res.status(404).json({ message: "Bestand niet gevonden" });
    }
  });

  const instructiesDir = path.join(uploadsDir, "Instructies");
  if (!fs.existsSync(instructiesDir)) {
    fs.mkdirSync(instructiesDir, { recursive: true });
  }

  app.get("/api/uploads/instructies", requireAuth, async (req: any, res) => {
    const userId = (req.session as any).userId;
    const user = await storage.getUser(userId);
    if (!user) return res.status(401).json({ message: "Niet ingelogd" });

    try {
      const allDepts = fs.readdirSync(instructiesDir, { withFileTypes: true })
        .filter((d: any) => d.isDirectory())
        .map((d: any) => d.name)
        .sort();

      const visibleDepts = isAdminRole(user.role)
        ? allDepts
        : allDepts.filter((d: string) => d === user.department);

      const result: Record<string, any[]> = {};
      for (const dept of visibleDepts) {
        const deptPath = path.join(instructiesDir, dept);
        const files = fs.readdirSync(deptPath)
          .filter((f: string) => f.toLowerCase().endsWith(".pdf"))
          .map((f: string) => {
            const stat = fs.statSync(path.join(deptPath, f));
            return { name: f, path: `/uploads/Instructies/${dept}/${f}`, size: stat.size, modified: stat.mtime };
          })
          .sort((a: any, b: any) => a.name.localeCompare(b.name));
        result[dept] = files;
      }

      if (!isAdminRole(user.role) && user.department && !result[user.department]) {
        result[user.department] = [];
      }

      res.json(result);
    } catch {
      res.json({});
    }
  });

  const instructiesUpload = multer({
    storage: multer.diskStorage({
      destination: (req: any, _file: any, cb: any) => {
        const dept = req.params.department;
        const deptPath = path.join(instructiesDir, dept);
        if (!fs.existsSync(deptPath)) fs.mkdirSync(deptPath, { recursive: true });
        cb(null, deptPath);
      },
      filename: (_req: any, file: any, cb: any) => cb(null, file.originalname),
    }),
    fileFilter: (_req: any, file: any, cb: any) => {
      if (file.mimetype === "application/pdf") cb(null, true);
      else cb(new Error("Alleen PDF-bestanden"));
    },
  });

  app.post("/api/uploads/instructies/:department", requireAuth, instructiesUpload.single("pdf"), async (req: any, res) => {
    const userId = (req.session as any).userId;
    const user = await storage.getUser(userId);
    if (!user || !isAdminRole(user.role)) {
      return res.status(403).json({ message: "Alleen beheerders" });
    }
    if (!req.file) {
      return res.status(400).json({ message: "Geen PDF-bestand ontvangen" });
    }
    const dept = req.params.department;
    res.json({ name: req.file.originalname, path: `/uploads/Instructies/${dept}/${req.file.originalname}` });
  });

  app.delete("/api/uploads/instructies/:department/:filename", requireAuth, async (req: any, res) => {
    const userId = (req.session as any).userId;
    const user = await storage.getUser(userId);
    if (!user || !isAdminRole(user.role)) {
      return res.status(403).json({ message: "Alleen beheerders" });
    }
    const dept = req.params.department;
    const filename = req.params.filename.replace(/[^a-zA-Z0-9._\- ]/g, "");
    const filePath = path.join(instructiesDir, dept, filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      res.json({ message: "Verwijderd" });
    } else {
      res.status(404).json({ message: "Bestand niet gevonden" });
    }
  });

  app.post("/api/auth/request-reset", authLimiter, async (req, res) => {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ message: "E-mail is verplicht" });
      }
      res.json({ message: "Als dit e-mailadres bekend is, is een verzoek ingediend bij de beheerder. Neem contact op met uw beheerder." });
    } catch (err) {
      res.status(500).json({ message: "Serverfout" });
    }
  });

  app.post("/api/auth/login", authLimiter, async (req, res) => {
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
      req.session.regenerate((err) => {
        if (err) {
          return res.status(500).json({ message: "Sessie fout" });
        }
        (req.session as any).userId = user.id;
        req.session.save((saveErr) => {
          if (saveErr) {
            return res.status(500).json({ message: "Sessie fout" });
          }
          const { password: _, ...safeUser } = user;
          res.json(safeUser);
        });
      });
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

  app.get("/api/absences/today", requireAuth, async (req, res) => {
    const userId = (req.session as any).userId;
    const currentUser = await storage.getUser(userId);
    if (!currentUser) return res.status(401).json({ message: "Niet ingelogd" });

    if (!isAdminRole(currentUser.role) && currentUser.role !== "manager" && currentUser.role !== "manager_az") {
      return res.status(403).json({ message: "Geen toegang" });
    }

    const today = new Date().toISOString().split("T")[0];

    const allAbsences = isAdminRole(currentUser.role)
      ? await storage.getAbsences()
      : currentUser.department
        ? await storage.getAbsencesByDepartment(currentUser.department)
        : [];

    const todayAbsences = allAbsences.filter(a => {
      return (a.status === "approved" || a.status === "pending") &&
        a.startDate <= today && a.endDate >= today;
    });

    const allDepts = await storage.getDepartments();
    const allUsers = await storage.getUsers();

    const grouped: Record<string, { managerName: string; managerRole: string; department: string; employees: { name: string; type: string; status: string; halfDay: string | null }[] }> = {};

    for (const absence of todayAbsences) {
      const dept = absence.userDepartment || "Onbekend";
      const deptRecord = allDepts.find(d => d.name === dept);
      let managerName = "Geen beheerder";
      let managerRole = "";
      if (deptRecord?.managerId) {
        const mgr = allUsers.find(u => u.id === deptRecord.managerId);
        if (mgr) {
          managerName = mgr.fullName;
          managerRole = mgr.role;
        }
      }

      const key = dept;
      if (!grouped[key]) {
        grouped[key] = { managerName, managerRole, department: dept, employees: [] };
      }
      grouped[key].employees.push({
        name: absence.userName || "Onbekend",
        type: absence.type,
        status: absence.status,
        halfDay: absence.halfDay,
      });
    }

    res.json({
      date: today,
      totalAbsent: todayAbsences.length,
      departments: Object.values(grouped),
    });
  });

  app.get("/api/users", requireAuth, async (_req, res) => {
    const allUsers = await storage.getUsers();
    res.json(allUsers.map(({ password: _, ...u }) => u));
  });

  app.post("/api/users", requirePersonaliaAdmin, async (req, res) => {
    try {
      const parsed = insertUserSchema.parse(req.body);
      if (parsed.password.length < 8) {
        return res.status(400).json({ message: "Wachtwoord moet minimaal 8 tekens bevatten" });
      }
      const hashed = await bcrypt.hash(parsed.password, 12);
      const user = await storage.createUser({ ...parsed, password: hashed });
      const { password: _, ...safeUser } = user;
      res.json(safeUser);
    } catch (err: any) {
      res.status(400).json({ message: err.message || "Validatiefout" });
    }
  });

  app.patch("/api/users/:id", requirePersonaliaAdmin, async (req, res) => {
    try {
      const data = { ...req.body };
      if (data.password) {
        if (data.password.length < 8) {
          return res.status(400).json({ message: "Wachtwoord moet minimaal 8 tekens bevatten" });
        }
        data.password = await bcrypt.hash(data.password, 12);
      }
      if (data.active === false && !data.endDate) {
        return res.status(400).json({ message: "Datum uit dienst is verplicht bij deactiveren" });
      }
      if (data.active === true) {
        data.endDate = null;
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

  app.post("/api/users/:id/avatar", requirePersonaliaAdmin, (req: any, res: any, next: any) => {
    uploadPasfoto.single("photo")(req, res, (err: any) => {
      if (err) {
        if (err.code === "LIMIT_FILE_SIZE") {
          return res.status(400).json({ message: "Bestand is te groot (maximaal 20 MB)" });
        }
        return res.status(400).json({ message: err.message || "Upload mislukt" });
      }
      next();
    });
  }, async (req: any, res: any) => {
    try {
      if (!req.file) return res.status(400).json({ message: "Geen bestand geüpload" });
      const avatarPath = `/uploads/Pasfoto/${req.file.filename}`;
      const user = await storage.updateUser(req.params.id, { avatar: avatarPath } as any);
      const { password: _, ...safeUser } = user;
      res.json(safeUser);
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Fout bij uploaden" });
    }
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

  app.get("/api/snipperdagen", requireAuth, async (req, res) => {
    const year = req.query.year ? parseInt(req.query.year as string) : undefined;
    const list = await storage.getSnipperdagen(year);
    res.json(list);
  });

  app.post("/api/snipperdagen", requireAuth, async (req, res) => {
    const user = req.user as any;
    if (!canManageVacation(user?.role)) {
      return res.status(403).json({ message: "Geen toegang" });
    }
    try {
      const { name, date } = req.body;
      if (!name || typeof name !== "string" || !name.trim()) {
        return res.status(400).json({ message: "Naam is verplicht" });
      }
      if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return res.status(400).json({ message: "Ongeldige datum" });
      }
      const year = parseInt(date.split("-")[0]);
      const existing = await storage.getSnipperdagen(year);
      if (existing.some(s => s.date === date)) {
        return res.status(400).json({ message: "Er bestaat al een snipperdag op deze datum" });
      }
      const snipperdag = await storage.createSnipperdag({
        name: name.trim(),
        date,
        year,
        createdBy: user.id,
      });
      res.json(snipperdag);
    } catch (err: any) {
      res.status(400).json({ message: err.message || "Aanmaken mislukt" });
    }
  });

  app.delete("/api/snipperdagen/:id", requireAuth, async (req, res) => {
    const user = req.user as any;
    if (!canManageVacation(user?.role)) {
      return res.status(403).json({ message: "Geen toegang" });
    }
    await storage.deleteSnipperdag(req.params.id);
    res.json({ message: "Verwijderd" });
  });

  app.get("/api/official-holidays", requireAuth, async (req, res) => {
    const year = req.query.year ? parseInt(req.query.year as string) : undefined;
    const holidays = await storage.getOfficialHolidays(year);
    res.json(holidays);
  });

  app.post("/api/official-holidays/single", requireAuth, async (req, res) => {
    const user = req.user as any;
    if (!isAdminRole(user?.role)) {
      return res.status(403).json({ message: "Geen toegang" });
    }
    try {
      const { name, date, year } = req.body;
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!name || typeof name !== "string" || !name.trim()) {
        return res.status(400).json({ message: "Naam is verplicht" });
      }
      if (!date || !dateRegex.test(date)) {
        return res.status(400).json({ message: "Ongeldige datum (verwacht JJJJ-MM-DD)" });
      }
      if (typeof year !== "number") {
        return res.status(400).json({ message: "Jaar is verplicht" });
      }
      const holiday = await storage.createOfficialHoliday({ name: name.trim(), date, year, createdBy: user.id });
      res.json(holiday);
    } catch (err: any) {
      res.status(400).json({ message: err.message || "Toevoegen mislukt" });
    }
  });

  app.post("/api/official-holidays", requireAuth, async (req, res) => {
    const user = req.user as any;
    if (!isAdminRole(user?.role)) {
      return res.status(403).json({ message: "Geen toegang" });
    }
    try {
      const holidays = req.body.holidays;
      const year = req.body.year;
      if (!Array.isArray(holidays) || typeof year !== "number" || holidays.length === 0) {
        return res.status(400).json({ message: "Ongeldige data: verwacht jaar (number) en holidays (array)" });
      }
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      const validated = holidays.map((h: any, i: number) => {
        if (!h.name || typeof h.name !== "string" || !h.name.trim()) {
          throw new Error(`Rij ${i + 1}: naam is verplicht`);
        }
        if (!h.date || !dateRegex.test(h.date)) {
          throw new Error(`Rij ${i + 1}: ongeldige datum (verwacht JJJJ-MM-DD)`);
        }
        return { name: h.name.trim(), date: h.date, year, createdBy: user.id };
      });
      await storage.deleteOfficialHolidaysByYear(year);
      const created = [];
      for (const v of validated) {
        const holiday = await storage.createOfficialHoliday(v);
        created.push(holiday);
      }
      res.json(created);
    } catch (err: any) {
      res.status(400).json({ message: err.message || "Upload mislukt" });
    }
  });

  app.delete("/api/official-holidays/:id", requireAuth, async (req, res) => {
    const user = req.user as any;
    if (!isAdminRole(user?.role)) {
      return res.status(403).json({ message: "Geen toegang" });
    }
    await storage.deleteOfficialHoliday(req.params.id);
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

  app.get("/api/vacation-balance", requireAuth, async (req, res) => {
    try {
      const allUsers = await storage.getUsers();
      const allAbsences = await storage.getAbsences();
      const currentYear = new Date().getFullYear();
      const yearSnipperdagen = await storage.getSnipperdagen(currentYear);
      const snipperdagenCount = yearSnipperdagen.length;

      const allCancellations = await storage.getAllAbsenceCancellations();

      const [holidaysPrev, holidaysCurr, holidaysNext] = await Promise.all([
        storage.getOfficialHolidays(currentYear - 1),
        storage.getOfficialHolidays(currentYear),
        storage.getOfficialHolidays(currentYear + 1),
      ]);
      const publicHolidaySet = new Set<string>(
        [...holidaysPrev, ...holidaysCurr, ...holidaysNext].map(h => h.date)
      );

      const absenceById = new Map(allAbsences.map(a => [a.id, a]));
      const todayStr = new Date().toISOString().split("T")[0];

      const perDayCancelByUser: Record<string, number> = {};
      const perDayCancelOpgenomenByUser: Record<string, number> = {};
      const perDaySickCancelByUser: Record<string, number> = {};
      for (const c of allCancellations) {
        const absence = absenceById.get(c.absenceId);
        if (!absence) continue;
        const cancelYear = new Date(c.cancelledDate).getFullYear();
        if (cancelYear !== currentYear) continue;
        if (publicHolidaySet.has(c.cancelledDate)) continue;
        const days = (absence.halfDay === "am" || absence.halfDay === "pm") ? 0.5 : 1;
        if ((c as any).affectsBalance) {
          perDayCancelByUser[absence.userId] = (perDayCancelByUser[absence.userId] || 0) + days;
          if (c.cancelledDate <= todayStr) {
            perDayCancelOpgenomenByUser[absence.userId] = (perDayCancelOpgenomenByUser[absence.userId] || 0) + days;
          }
        }
        if (absence.type === "sick") {
          perDaySickCancelByUser[absence.userId] = (perDaySickCancelByUser[absence.userId] || 0) + days;
        }
      }

      const countWeekdays = (startStr: string, endStr: string): number => {
        const start = new Date(startStr + "T00:00:00");
        const end = new Date(endStr + "T00:00:00");
        let count = 0;
        const current = new Date(start);
        while (current <= end) {
          const day = current.getDay();
          const dateStr = current.toISOString().split("T")[0];
          if (day !== 0 && day !== 6 && !publicHolidaySet.has(dateStr)) count++;
          current.setDate(current.getDate() + 1);
        }
        return count;
      }

      const countDays = (list: typeof allAbsences) => {
        let days = 0;
        for (const a of list) {
          if (a.halfDay === "am" || a.halfDay === "pm") {
            days += 0.5;
          } else {
            days += countWeekdays(a.startDate, a.endDate);
          }
        }
        return days;
      };

      const countDaysUpTo = (list: typeof allAbsences, upTo: string) => {
        let days = 0;
        for (const a of list) {
          if (a.startDate > upTo) continue;
          const effectiveEnd = a.endDate <= upTo ? a.endDate : upTo;
          if (a.halfDay === "am" || a.halfDay === "pm") {
            days += 0.5;
          } else {
            days += countWeekdays(a.startDate, effectiveEnd);
          }
        }
        return days;
      };

      const balances = allUsers.filter(u => u.active).map(u => {
        const userVacAbsences = allAbsences.filter(
          a => a.userId === u.id &&
            (a.type === "vacation" ||
              ((a.type === "personal" || a.type === "other") && (a as any).deductVacation === true) ||
              (a.type === "persoonlijk" && (a as any).persoonlijkBesluit === "ongeoorloofd")) &&
            new Date(a.startDate).getFullYear() === currentYear
        );
        const userSickAbsences = allAbsences.filter(
          a => a.userId === u.id && a.type === "sick" &&
            new Date(a.startDate).getFullYear() === currentYear &&
            (a.status === "approved" || a.status === "pending")
        );
        const userPersoonlijkGeoorloofd = allAbsences.filter(
          a => a.userId === u.id &&
            a.type === "persoonlijk" &&
            (a as any).persoonlijkBesluit === "geoorloofd" &&
            a.status === "approved" &&
            new Date(a.startDate).getFullYear() === currentYear
        );
        // Rejected persoonlijk absences for past periods count as ongeoorloofd → deducted from vacation balance
        const userRejectedPastPersoonlijk = allAbsences.filter(
          a => a.userId === u.id &&
            a.type === "persoonlijk" &&
            a.status === "rejected" &&
            a.endDate < todayStr &&
            new Date(a.startDate).getFullYear() === currentYear
        );
        const rejectedPastDays = countDays(userRejectedPastPersoonlijk);
        const approved = userVacAbsences.filter(a => a.status === "approved");
        const pending = userVacAbsences.filter(a => a.status === "pending");
        const cancelDays = perDayCancelByUser[u.id] || 0;
        const pastCancelDays = perDayCancelOpgenomenByUser[u.id] || 0;
        const toegekendDays = Math.max(0, countDays(approved) + rejectedPastDays - cancelDays);
        const geplandDays = countDays(pending);
        const opgenomenDays = Math.max(0, countDaysUpTo(approved, todayStr) + rejectedPastDays - pastCancelDays);
        const sickDays = Math.max(0, countDays(userSickAbsences) - (perDaySickCancelByUser[u.id] || 0));
        const persoonlijkGeoorloofdDays = countDays(userPersoonlijkGeoorloofd);
        // Ongeoorloofd = approved persoonlijk with besluit=ongeoorloofd + rejected past persoonlijk
        const ongeoorloofdApproved = userVacAbsences.filter(
          a => a.status === "approved" &&
            a.type === "persoonlijk" &&
            (a as any).persoonlijkBesluit === "ongeoorloofd"
        );
        const ongeoorloofdDays = countDays(ongeoorloofdApproved) + rejectedPastDays;
        const recht = u.vacationDaysTotal ?? 25;
        const saldoOud = u.vacationDaysSaldoOud ?? 0;
        const totaal = recht + saldoOud;
        return {
          userId: u.id,
          userName: u.fullName,
          department: u.department || "Geen afdeling",
          recht,
          saldoOud,
          totalDays: totaal,
          geplandDays,
          toegekendDays,
          opgenomenDays,
          sickDays,
          snipperdagen: snipperdagenCount,
          cancelDays,
          persoonlijkGeoorloofdDays,
          ongeoorloofdDays,
          remainingDays: totaal - toegekendDays - geplandDays - snipperdagenCount,
        };
      });
      res.json(balances);
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Fout bij ophalen saldo" });
    }
  });

  app.patch("/api/users/:id/vacation-days", requireAuth, async (req, res) => {
    const currentUser = req.user as any;
    if (!canManageVacation(currentUser?.role)) {
      return res.status(403).json({ message: "Geen toegang" });
    }
    try {
      const { vacationDaysTotal } = req.body;
      if (typeof vacationDaysTotal !== "number" || vacationDaysTotal < 0) {
        return res.status(400).json({ message: "Ongeldig aantal vakantiedagen" });
      }
      const user = await storage.updateUser(req.params.id, { vacationDaysTotal } as any);
      const { password: _, ...safeUser } = user;
      res.json(safeUser);
    } catch (err: any) {
      res.status(400).json({ message: err.message || "Bijwerken mislukt" });
    }
  });

  app.patch("/api/users/:id/saldo-oud", requireAuth, async (req, res) => {
    const currentUser = req.user as any;
    if (!canManageVacation(currentUser?.role)) {
      return res.status(403).json({ message: "Geen toegang" });
    }
    try {
      const { vacationDaysSaldoOud } = req.body;
      if (typeof vacationDaysSaldoOud !== "number" || vacationDaysSaldoOud < 0) {
        return res.status(400).json({ message: "Ongeldig saldo oud" });
      }
      const user = await storage.updateUser(req.params.id, { vacationDaysSaldoOud } as any);
      const { password: _, ...safeUser } = user;
      res.json(safeUser);
    } catch (err: any) {
      res.status(400).json({ message: err.message || "Bijwerken mislukt" });
    }
  });

  app.get("/api/absences", requireAuth, async (req, res) => {
    const userId = (req.session as any).userId;
    const currentUser = await storage.getUser(userId);
    if (!currentUser) return res.status(401).json({ message: "Niet ingelogd" });

    if (isAdminRole(currentUser.role)) {
      const all = await storage.getAbsences();
      return res.json(all);
    }

    if (currentUser.role === "manager" || currentUser.role === "manager_az") {
      const dept = currentUser.department;
      if (dept) {
        const deptAbsences = await storage.getAbsencesByDepartment(dept);
        return res.json(deptAbsences);
      }
      const mine = await storage.getAbsencesByUser(userId);
      return res.json(mine);
    }

    const mine = await storage.getAbsencesByUser(userId);
    res.json(mine);
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
      const requestingUser = await storage.getUser(parsed.userId);
      if (requestingUser?.role === "directeur") {
        await storage.updateAbsenceStatus(absence.id, "approved", parsed.userId);
        const updated = (await storage.getAbsences()).find(a => a.id === absence.id);
        return res.json(updated || absence);
      }
      res.json(absence);
    } catch (err: any) {
      res.status(400).json({ message: err.message || "Validatiefout" });
    }
  });

  app.patch("/api/absences/:id", requireAuth, async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      const currentUser = await storage.getUser(userId);
      if (!currentUser) return res.status(401).json({ message: "Niet ingelogd" });

      const allAbsences = await storage.getAbsences();
      const absence = allAbsences.find((a) => a.id === req.params.id);
      if (!absence) return res.status(404).json({ message: "Melding niet gevonden" });

      const absenceUser = await storage.getUser(absence.userId);

      if ((absenceUser && isAdminRole(absenceUser.role)) || absenceUser?.role === "manager" || absenceUser?.role === "manager_az") {
        if (currentUser.role !== "directeur") {
          return res.status(403).json({ message: "Alleen de directeur kan verzuimverzoeken van beheerders en managers goedkeuren" });
        }
      } else if (currentUser.role === "manager" || currentUser.role === "manager_az") {
        if (absenceUser?.department !== currentUser.department) {
          return res.status(403).json({ message: "U kunt alleen verzuim van uw eigen afdeling goedkeuren" });
        }
      } else if (!isAdminRole(currentUser.role)) {
        return res.status(403).json({ message: "Geen rechten om verzuim goed te keuren" });
      }

      const { status, persoonlijkBesluit } = req.body;
      await storage.updateAbsenceStatus(req.params.id, status, userId, undefined, persoonlijkBesluit ?? undefined);
      res.json({ message: "Bijgewerkt" });
    } catch (err: any) {
      res.status(400).json({ message: err.message || "Bijwerken mislukt" });
    }
  });

  app.delete("/api/absences/:id", requireAuth, async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      const currentUser = await storage.getUser(userId);
      if (!currentUser) return res.status(401).json({ message: "Niet ingelogd" });
      const absence = await storage.getAbsenceById(req.params.id);
      if (!absence) return res.status(404).json({ message: "Melding niet gevonden" });
      const canDelete = isAdminRole(currentUser.role) || canManageVacation(currentUser.role) || absence.userId === currentUser.id;
      if (!canDelete) return res.status(403).json({ message: "Geen rechten om deze melding te verwijderen" });
      await storage.deleteAbsence(req.params.id);
      res.json({ message: "Verwijderd" });
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Verwijderen mislukt" });
    }
  });

  app.get("/api/absences/user/:userId", requireAdmin, async (req, res) => {
    try {
      const absenceList = await storage.getAbsencesByUser(req.params.userId);
      const active = absenceList.filter(a =>
        a.status === "pending" || a.status === "approved"
      );
      res.json(active);
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Fout bij ophalen" });
    }
  });

  app.post("/api/absences/:id/cancel", requireAdmin, async (req, res) => {
    try {
      const absence = await storage.getAbsenceById(req.params.id);
      if (!absence) return res.status(404).json({ message: "Verlofmelding niet gevonden" });

      const absenceYear = new Date(absence.startDate).getFullYear();
      const [holidaysPrev, holidaysCurr, holidaysNext] = await Promise.all([
        storage.getOfficialHolidays(absenceYear - 1),
        storage.getOfficialHolidays(absenceYear),
        storage.getOfficialHolidays(absenceYear + 1),
      ]);
      const publicHolidaySet = new Set<string>(
        [...holidaysPrev, ...holidaysCurr, ...holidaysNext].map(h => h.date)
      );

      const countWeekdays = (startStr: string, endStr: string): number => {
        const start = new Date(startStr + "T00:00:00");
        const end = new Date(endStr + "T00:00:00");
        let count = 0;
        const cur = new Date(start);
        while (cur <= end) {
          const d = cur.getDay();
          const dateStr = cur.toISOString().split("T")[0];
          if (d !== 0 && d !== 6 && !publicHolidaySet.has(dateStr)) count++;
          cur.setDate(cur.getDate() + 1);
        }
        return count;
      };

      const today = new Date().toISOString().split("T")[0];
      let takenDays = 0;

      if (absence.status === "approved") {
        if (absence.startDate <= today) {
          const effectiveEnd = absence.endDate <= today ? absence.endDate : today;
          if (absence.halfDay === "am" || absence.halfDay === "pm") {
            takenDays = 0.5;
          } else {
            takenDays = countWeekdays(absence.startDate, effectiveEnd);
          }
        }
      }

      const cancelReason = req.body?.cancelReason?.trim() || undefined;
      await storage.updateAbsenceStatus(absence.id, "cancelled", null, cancelReason);

      if (takenDays > 0) {
        const user = await storage.getUser(absence.userId);
        if (user) {
          const currentCancel = (user as any).vacationDaysCancel ?? 0;
          await storage.updateUser(absence.userId, { vacationDaysCancel: currentCancel + takenDays } as any);
        }
      }

      res.json({ cancelled: true, takenDays });
    } catch (err: any) {
      res.status(400).json({ message: err.message || "Annuleren mislukt" });
    }
  });

  app.get("/api/absence-cancellations", requireAdmin, async (req, res) => {
    try {
      const all = await storage.getAllAbsenceCancellations();
      res.json(all);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.get("/api/absence-cancellations/user/:userId", requireAuth, async (req, res) => {
    try {
      const currentUser = req.user as any;
      const targetUserId = req.params.userId;
      if (!isAdminRole(currentUser.role) && !canManageVacation(currentUser.role) && currentUser.id !== targetUserId) {
        return res.status(403).json({ message: "Geen toegang" });
      }
      const cancellations = await storage.getAbsenceCancellationsByUser(targetUserId);
      res.json(cancellations);
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.post("/api/absence-cancellations", requireAdmin, async (req, res) => {
    try {
      const { absenceId, cancelledDate, cancelReason } = req.body;
      if (!absenceId || !cancelledDate) {
        return res.status(400).json({ message: "absenceId en cancelledDate zijn verplicht" });
      }

      const absence = await storage.getAbsenceById(absenceId);
      if (!absence) return res.status(404).json({ message: "Verlofmelding niet gevonden" });

      const affectsBalance = absence.type === "vacation"
        || (["sick", "bvvd"].includes(absence.type) && absence.deductVacation === true);

      const cancellation = await storage.createAbsenceCancellation({
        absenceId,
        cancelledDate,
        cancelReason: cancelReason?.trim() || null,
        cancelledBy: (req.session as any).userId,
        affectsBalance,
      });

      if (affectsBalance) {
        const user = await storage.getUser(absence.userId);
        if (user) {
          const isHalfDay = absence.halfDay === "am" || absence.halfDay === "pm";
          const days = isHalfDay ? 0.5 : 1;
          const currentCancel = (user as any).vacationDaysCancel ?? 0;
          await storage.updateUser(absence.userId, { vacationDaysCancel: currentCancel + days } as any);
        }
      }

      res.json({ ...cancellation, affectsBalance, daysBooked: affectsBalance ? (absence.halfDay ? 0.5 : 1) : 0 });
    } catch (err: any) {
      res.status(400).json({ message: err.message || "Annuleren mislukt" });
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

  app.get("/api/yearly-awards", requireAuth, async (req, res) => {
    const year = req.query.year ? parseInt(req.query.year as string) : undefined;
    const awards = await storage.getYearlyAwards(year);
    res.json(awards);
  });

  app.post("/api/yearly-awards", requireAuth, uploadBeloning.single("photo"), async (req: any, res) => {
    const sessionUser = await storage.getUser((req.session as any).userId);
    if (!sessionUser || !isAdminRole(sessionUser.role)) {
      return res.status(403).json({ message: "Alleen admin/directeur" });
    }
    try {
      const photoUrl = req.file ? `/uploads/Beloning/${req.file.filename}` : null;
      const award = await storage.createYearlyAward({
        year: parseInt(req.body.year),
        type: req.body.type,
        name: req.body.name,
        awardedBy: req.body.awardedBy || null,
        photo: photoUrl,
      });
      res.json(award);
    } catch (err: any) {
      res.status(400).json({ message: err.message || "Validatiefout" });
    }
  });

  app.delete("/api/yearly-awards/:id", requireAuth, async (req, res) => {
    const sessionUser = await storage.getUser((req.session as any).userId);
    if (!sessionUser || !isAdminRole(sessionUser.role)) {
      return res.status(403).json({ message: "Alleen admin/directeur" });
    }
    await storage.deleteYearlyAward(req.params.id);
    res.json({ success: true });
  });

  app.get("/api/job-functions", requireAuth, async (_req, res) => {
    const funcs = await storage.getJobFunctions();
    res.json(funcs);
  });

  app.post("/api/job-functions", requireAuth, async (req, res) => {
    const sessionUser = await storage.getUser((req.session as any).userId);
    if (!sessionUser || !isAdminRole(sessionUser.role)) {
      return res.status(403).json({ message: "Alleen admin/directeur" });
    }
    const { name, description, departmentId, sortOrder } = req.body;
    if (!name?.trim()) return res.status(400).json({ message: "Naam is verplicht" });
    const created = await storage.createJobFunction({
      name: name.trim(),
      description: description || null,
      departmentId: departmentId || null,
      sortOrder: sortOrder !== undefined ? parseInt(sortOrder) : 0,
    });
    res.json(created);
  });

  app.patch("/api/job-functions/bulk-sort-order", requireAuth, async (req, res) => {
    const sessionUser = await storage.getUser((req.session as any).userId);
    if (!sessionUser || !isAdminRole(sessionUser.role)) {
      return res.status(403).json({ message: "Alleen admin/directeur" });
    }
    const { updates } = req.body as { updates: { id: string; sortOrder: number }[] };
    if (!Array.isArray(updates)) return res.status(400).json({ message: "Ongeldige data" });
    for (const { id, sortOrder } of updates) {
      await storage.updateJobFunction(id, { sortOrder });
    }
    res.json({ success: true });
  });

  app.patch("/api/job-functions/:id", requireAuth, async (req, res) => {
    const sessionUser = await storage.getUser((req.session as any).userId);
    if (!sessionUser || !isAdminRole(sessionUser.role)) {
      return res.status(403).json({ message: "Alleen admin/directeur" });
    }
    const { name, description, departmentId, sortOrder } = req.body;
    const updated = await storage.updateJobFunction(req.params.id, {
      ...(name !== undefined && { name: name.trim() }),
      ...(description !== undefined && { description: description || null }),
      ...(departmentId !== undefined && { departmentId: departmentId || null }),
      ...(sortOrder !== undefined && { sortOrder: parseInt(sortOrder) }),
    });
    res.json(updated);
  });

  app.delete("/api/job-functions/:id", requireAuth, async (req, res) => {
    const sessionUser = await storage.getUser((req.session as any).userId);
    if (!sessionUser || !isAdminRole(sessionUser.role)) {
      return res.status(403).json({ message: "Alleen admin/directeur" });
    }
    await storage.deleteJobFunction(req.params.id);
    res.json({ success: true });
  });

  app.post("/api/job-functions/:id/upload-description", requireAuth, uploadFunctie.single("file"), async (req: any, res) => {
    const sessionUser = await storage.getUser((req.session as any).userId);
    if (!sessionUser || !isAdminRole(sessionUser.role)) {
      return res.status(403).json({ message: "Alleen admin/directeur" });
    }
    if (!req.file) return res.status(400).json({ message: "Geen bestand geüpload" });
    const filePath = `/uploads/Functies/${req.file.filename}`;
    const updated = await storage.updateJobFunction(req.params.id, { descriptionFilePath: filePath });
    res.json(updated);
  });

  app.get("/api/functionering", requireAuth, async (req, res) => {
    const year = req.query.year ? parseInt(req.query.year as string) : undefined;
    if (year) {
      const reviews = await storage.getFunctioneringReviewsByYear(year);
      res.json(reviews);
    } else {
      const reviews = await storage.getFunctioneringReviews();
      res.json(reviews);
    }
  });

  app.get("/api/functionering/mine", requireAuth, async (req, res) => {
    const userId = (req.session as any).userId;
    const reviews = await storage.getFunctioneringReviewsByUser(userId);
    res.json(reviews);
  });

  app.get("/api/functionering/:userId/:year", requireAuth, async (req, res) => {
    const { userId, year } = req.params;
    const review = await storage.getFunctioneringReviewByUserAndYear(userId, parseInt(year));
    if (!review) {
      res.status(404).json({ message: "Geen functioneringsgesprek gevonden" });
      return;
    }
    res.json(review);
  });

  app.post("/api/functionering", requireAuth, async (req, res) => {
    try {
      const { editId, functioneringsJaar, ...rest } = req.body;
      const parsed = insertFunctioneringReviewSchema.parse(rest);
      if (editId) {
        const updated = await storage.updateFunctioneringReview(editId, parsed);
        res.json(updated);
      } else {
        const review = await storage.createFunctioneringReview(parsed);
        res.json(review);
      }
    } catch (err: any) {
      res.status(400).json({ message: err.message || "Validatiefout" });
    }
  });

  app.put("/api/functionering/:id", requireAuth, async (req, res) => {
    try {
      const updated = await storage.updateFunctioneringReview(req.params.id, req.body);
      res.json(updated);
    } catch (err: any) {
      res.status(400).json({ message: err.message || "Bijwerken mislukt" });
    }
  });

  app.delete("/api/functionering/:id", requireAuth, async (req, res) => {
    await storage.deleteFunctioneringReview(req.params.id);
    res.json({ success: true });
  });

  app.get("/api/competencies", requireAuth, async (_req, res) => {
    const comps = await storage.getAllCompetencies();
    res.json(comps);
  });

  app.get("/api/competencies/functie/:functie", requireAuth, async (req, res) => {
    const comps = await storage.getCompetenciesByFunctie(req.params.functie);
    res.json(comps);
  });

  app.post("/api/competencies", requireAuth, async (req, res) => {
    if (!isAdminRole((req as any).user.role) && (req as any).user.role !== "manager") {
      return res.status(403).json({ message: "Geen toegang" });
    }
    try {
      const parsed = insertCompetencySchema.parse(req.body);
      const comp = await storage.createCompetency(parsed);
      res.json(comp);
    } catch (err: any) {
      res.status(400).json({ message: err.message || "Validatiefout" });
    }
  });

  app.put("/api/competencies/:id", requireAuth, async (req, res) => {
    if (!isAdminRole((req as any).user.role) && (req as any).user.role !== "manager") {
      return res.status(403).json({ message: "Geen toegang" });
    }
    try {
      const updated = await storage.updateCompetency(req.params.id, req.body);
      res.json(updated);
    } catch (err: any) {
      res.status(400).json({ message: err.message || "Bijwerken mislukt" });
    }
  });

  app.delete("/api/competencies/:id", requireAuth, async (req, res) => {
    if (!isAdminRole((req as any).user.role) && (req as any).user.role !== "manager") {
      return res.status(403).json({ message: "Geen toegang" });
    }
    await storage.deleteCompetency(req.params.id);
    res.json({ success: true });
  });

  app.get("/api/beoordeling", requireAuth, async (req, res) => {
    const year = req.query.year ? parseInt(req.query.year as string) : undefined;
    if (year) {
      const reviews = await storage.getBeoordelingReviewsByYear(year);
      res.json(reviews);
    } else {
      const reviews = await storage.getBeoordelingReviews();
      res.json(reviews);
    }
  });

  app.get("/api/beoordeling/mine", requireAuth, async (req, res) => {
    const userId = (req.session as any).userId;
    const reviews = await storage.getBeoordelingReviewsByUser(userId);
    res.json(reviews);
  });

  app.get("/api/beoordeling/:id/scores", requireAuth, async (req, res) => {
    const scores = await storage.getBeoordelingScoresByReview(req.params.id);
    res.json(scores);
  });

  app.post("/api/beoordeling", requireAuth, async (req, res) => {
    if (!isAdminRole((req as any).user.role) && (req as any).user.role !== "manager") {
      return res.status(403).json({ message: "Geen toegang" });
    }
    try {
      const { scores, editId, ...reviewData } = req.body;
      const parsed = insertBeoordelingReviewSchema.parse(reviewData);
      let review;
      if (editId) {
        review = await storage.updateBeoordelingReview(editId, parsed);
        await storage.deleteBeoordelingScoresByReview(editId);
      } else {
        review = await storage.createBeoordelingReview(parsed);
      }
      if (scores && Array.isArray(scores)) {
        for (const s of scores) {
          await storage.createBeoordelingScore({
            reviewId: review.id,
            competencyId: s.competencyId,
            score: s.score,
            toelichting: s.toelichting || null,
          });
        }
      }
      const savedScores = await storage.getBeoordelingScoresByReview(review.id);
      res.json({ ...review, scores: savedScores });
    } catch (err: any) {
      res.status(400).json({ message: err.message || "Validatiefout" });
    }
  });

  app.delete("/api/beoordeling/:id", requireAuth, async (req, res) => {
    if (!isAdminRole((req as any).user.role) && (req as any).user.role !== "manager") {
      return res.status(403).json({ message: "Geen toegang" });
    }
    await storage.deleteBeoordelingReview(req.params.id);
    res.json({ success: true });
  });

  app.get("/api/applications", requireAuth, async (_req, res) => {
    const all = await storage.getApplications();
    res.json(all);
  });

  app.post("/api/applications", requireAuth, async (req, res) => {
    if (!isAdminRole((req as any).user.role)) return res.status(403).json({ message: "Alleen admin" });
    try {
      const parsed = insertApplicationSchema.parse(req.body);
      const app2 = await storage.createApplication(parsed);
      res.json(app2);
    } catch (err: any) {
      res.status(400).json({ message: err.message || "Validatiefout" });
    }
  });

  app.patch("/api/applications/:id", requireAuth, async (req, res) => {
    if (!isAdminRole((req as any).user.role)) return res.status(403).json({ message: "Alleen admin" });
    try {
      const app2 = await storage.updateApplication(req.params.id, req.body);
      res.json(app2);
    } catch (err: any) {
      res.status(400).json({ message: err.message || "Bijwerken mislukt" });
    }
  });

  app.delete("/api/applications/:id", requireAuth, async (req, res) => {
    if (!isAdminRole((req as any).user.role)) return res.status(403).json({ message: "Alleen admin" });
    await storage.deleteApplication(req.params.id);
    res.json({ message: "Verwijderd" });
  });

  app.get("/api/app-access", requireAuth, async (_req, res) => {
    const all = await storage.getAppAccess();
    res.json(all);
  });

  app.post("/api/app-access", requireAuth, async (req, res) => {
    if (!isAdminRole((req as any).user.role)) return res.status(403).json({ message: "Alleen admin" });
    try {
      const parsed = insertAppAccessSchema.parse(req.body);
      const access = await storage.createAppAccess(parsed);
      res.json(access);
    } catch (err: any) {
      res.status(400).json({ message: err.message || "Validatiefout" });
    }
  });

  app.delete("/api/app-access/:id", requireAuth, async (req, res) => {
    if (!isAdminRole((req as any).user.role)) return res.status(403).json({ message: "Alleen admin" });
    await storage.deleteAppAccess(req.params.id);
    res.json({ message: "Verwijderd" });
  });

  app.get("/api/messages", requireAuth, async (req, res) => {
    const userId = (req.session as any).userId;
    const msgs = await storage.getMessagesByUser(userId);
    res.json(msgs);
  });

  app.post("/api/messages", requireAuth, async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      const user = await storage.getUser(userId);
      if (!user || (!isAdminRole(user.role) && user.role !== "manager")) {
        return res.status(403).json({ message: "Alleen beheerders en managers mogen berichten sturen" });
      }
      const { toUserIds, ...rest } = req.body;
      const recipientIds: string[] = Array.isArray(toUserIds) && toUserIds.length > 0
        ? [...new Set(toUserIds as string[])]
        : req.body.toUserId ? [req.body.toUserId] : [];

      if (recipientIds.length === 0) {
        return res.status(400).json({ message: "Selecteer minimaal één ontvanger" });
      }

      if (user.role === "manager" || user.role === "manager_az") {
        const allUsers = await storage.getUsers();
        const allowedIds = allUsers
          .filter(u => u.active && u.department === user.department && u.id !== user.id)
          .map(u => u.id);
        const invalidIds = recipientIds.filter(id => !allowedIds.includes(id));
        if (invalidIds.length > 0) {
          return res.status(403).json({ message: "U kunt alleen berichten sturen naar medewerkers in uw eigen afdeling" });
        }
      }

      const allRecipients = await Promise.all(
        recipientIds.map(id => storage.getUser(id))
      );
      const invalidRecipients = recipientIds.filter((id, i) => !allRecipients[i] || !allRecipients[i]!.active);
      if (invalidRecipients.length > 0) {
        return res.status(400).json({ message: "Een of meer ontvangers zijn ongeldig of inactief" });
      }

      const created = [];
      for (const toId of recipientIds) {
        const parsed = insertMessageSchema.parse({ ...rest, toUserId: toId, fromUserId: userId });
        const msg = await storage.createMessage(parsed);
        created.push(msg);
      }
      res.json(recipientIds.length === 1 ? created[0] : created);
    } catch (err: any) {
      res.status(400).json({ message: err.message || "Validatiefout" });
    }
  });

  app.patch("/api/messages/:id/reply", requireAuth, async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      const allMessages = await storage.getMessagesByUser(userId);
      const msg = allMessages.find(m => m.id === req.params.id);
      if (!msg || msg.toUserId !== userId) {
        return res.status(403).json({ message: "Geen toegang tot dit bericht" });
      }
      if (msg.reply) {
        return res.status(400).json({ message: "Er is al gereageerd op dit bericht" });
      }
      const { reply } = req.body;
      if (!reply || !reply.trim()) {
        return res.status(400).json({ message: "Reactie is verplicht" });
      }
      const updated = await storage.replyToMessage(req.params.id, reply);
      res.json(updated);
    } catch (err: any) {
      res.status(400).json({ message: err.message || "Reageren mislukt" });
    }
  });

  app.patch("/api/messages/:id/read", requireAuth, async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      const allMessages = await storage.getMessagesByUser(userId);
      const msg = allMessages.find(m => m.id === req.params.id);
      if (!msg || msg.toUserId !== userId) {
        return res.status(403).json({ message: "Geen toegang tot dit bericht" });
      }
      await storage.markMessageRead(req.params.id);
      res.json({ message: "Gelezen" });
    } catch (err: any) {
      res.status(400).json({ message: err.message || "Bijwerken mislukt" });
    }
  });

  // AO Procedures
  app.get("/api/ao-procedures", requireAuth, async (_req, res) => {
    const all = await storage.getAoProcedures();
    res.json(all);
  });

  app.post("/api/ao-procedures", requireAuth, async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      const user = await storage.getUser(userId);
      if (!user || !isAdminRole(user.role)) {
        return res.status(403).json({ message: "Alleen beheerders" });
      }
      const parsed = insertAoProcedureSchema.parse(req.body);
      const proc = await storage.createAoProcedure(parsed);
      res.json(proc);
    } catch (err: any) {
      res.status(400).json({ message: err.message || "Validatiefout" });
    }
  });

  app.delete("/api/ao-procedures/:id", requireAdmin, async (req, res) => {
    await storage.deleteAoProcedure(req.params.id);
    res.json({ message: "Verwijderd" });
  });

  // AO Instructions
  app.get("/api/ao-instructions/:procedureId", requireAuth, async (req, res) => {
    const instructions = await storage.getAoInstructions(req.params.procedureId);
    res.json(instructions);
  });

  app.post("/api/ao-instructions", requireAuth, async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      const user = await storage.getUser(userId);
      if (!user || !isAdminRole(user.role)) {
        return res.status(403).json({ message: "Alleen beheerders" });
      }
      const parsed = insertAoInstructionSchema.parse(req.body);
      const instr = await storage.createAoInstruction(parsed);
      res.json(instr);
    } catch (err: any) {
      res.status(400).json({ message: err.message || "Validatiefout" });
    }
  });

  app.delete("/api/ao-instructions/:id", requireAdmin, async (req, res) => {
    await storage.deleteAoInstruction(req.params.id);
    res.json({ message: "Verwijderd" });
  });

  // Position History
  app.get("/api/position-history/mine", requireAuth, async (req, res) => {
    const userId = (req.session as any).userId;
    const history = await storage.getPositionHistoryByUser(userId);
    res.json(history);
  });

  app.get("/api/position-history/user/:userId", requireAuth, async (req, res) => {
    const currentUserId = (req.session as any).userId;
    const currentUser = await storage.getUser(currentUserId);
    if (!currentUser) return res.status(401).json({ message: "Niet ingelogd" });
    if (!isAdminRole(currentUser.role) && currentUserId !== req.params.userId) {
      return res.status(403).json({ message: "Geen toegang" });
    }
    const history = await storage.getPositionHistoryByUser(req.params.userId);
    res.json(history);
  });

  app.get("/api/position-history", requireAdmin, async (_req, res) => {
    const all = await storage.getPositionHistoryAll();
    res.json(all);
  });

  app.post("/api/position-history", requireAdmin, async (req, res) => {
    try {
      const parsed = insertPositionHistorySchema.parse(req.body);
      const entry = await storage.createPositionHistory(parsed);
      res.json(entry);
    } catch (err: any) {
      res.status(400).json({ message: err.message || "Validatiefout" });
    }
  });

  app.patch("/api/position-history/:id", requireAdmin, async (req, res) => {
    try {
      const entry = await storage.updatePositionHistory(req.params.id, req.body);
      res.json(entry);
    } catch (err: any) {
      res.status(400).json({ message: err.message || "Bijwerken mislukt" });
    }
  });

  app.delete("/api/position-history/:id", requireAdmin, async (req, res) => {
    await storage.deletePositionHistory(req.params.id);
    res.json({ message: "Verwijderd" });
  });

  // Personal Development
  app.get("/api/personal-development/mine", requireAuth, async (req, res) => {
    const userId = (req.session as any).userId;
    const entries = await storage.getPersonalDevelopmentByUser(userId);
    res.json(entries);
  });

  app.get("/api/personal-development/user/:userId", requireAuth, async (req, res) => {
    const currentUserId = (req.session as any).userId;
    const currentUser = await storage.getUser(currentUserId);
    if (!currentUser) return res.status(401).json({ message: "Niet ingelogd" });
    if (!isAdminRole(currentUser.role) && currentUserId !== req.params.userId) {
      return res.status(403).json({ message: "Geen toegang" });
    }
    const entries = await storage.getPersonalDevelopmentByUser(req.params.userId);
    res.json(entries);
  });

  app.post("/api/personal-development", requireAdmin, async (req, res) => {
    try {
      const parsed = insertPersonalDevelopmentSchema.parse(req.body);
      const entry = await storage.createPersonalDevelopment(parsed);
      res.json(entry);
    } catch (err: any) {
      res.status(400).json({ message: err.message || "Validatiefout" });
    }
  });

  app.patch("/api/personal-development/:id", requireAdmin, async (req, res) => {
    try {
      const entry = await storage.updatePersonalDevelopment(req.params.id, req.body);
      res.json(entry);
    } catch (err: any) {
      res.status(400).json({ message: err.message || "Bijwerken mislukt" });
    }
  });

  app.delete("/api/personal-development/:id", requireAdmin, async (req, res) => {
    await storage.deletePersonalDevelopment(req.params.id);
    res.json({ message: "Verwijderd" });
  });

  // Legislation Links
  app.get("/api/legislation", requireAuth, async (_req, res) => {
    const all = await storage.getLegislationLinks();
    res.json(all);
  });

  app.post("/api/legislation", requireAuth, uploadPdf.single("pdf"), async (req: any, res) => {
    try {
      const userId = (req.session as any).userId;
      const user = await storage.getUser(userId);
      if (!user || !isAdminRole(user.role)) {
        return res.status(403).json({ message: "Alleen beheerders" });
      }
      const body = {
        title: req.body.title,
        url: req.body.url || "",
        description: req.body.description || null,
        category: req.body.category,
        pdfUrl: req.file ? `/uploads/${req.file.filename}` : (req.body.pdfUrl || null),
      };
      const parsed = insertLegislationLinkSchema.parse(body);
      const link = await storage.createLegislationLink(parsed);
      res.json(link);
    } catch (err: any) {
      res.status(400).json({ message: err.message || "Validatiefout" });
    }
  });

  app.delete("/api/legislation/:id", requireAdmin, async (req, res) => {
    await storage.deleteLegislationLink(req.params.id);
    res.json({ message: "Verwijderd" });
  });

  app.get("/api/cao-documents", requireAuth, async (_req, res) => {
    const all = await storage.getCaoDocuments();
    res.json(all);
  });

  app.post("/api/cao-documents", requireAuth, async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      const user = await storage.getUser(userId);
      if (!user || !isAdminRole(user.role)) {
        return res.status(403).json({ message: "Alleen beheerders" });
      }
      const parsed = insertCaoDocumentSchema.parse(req.body);
      const doc = await storage.createCaoDocument(parsed);
      res.json(doc);
    } catch (err: any) {
      res.status(400).json({ message: err.message || "Validatiefout" });
    }
  });

  app.delete("/api/cao-documents/:id", requireAdmin, async (req, res) => {
    await storage.deleteCaoDocument(req.params.id);
    res.json({ message: "Verwijderd" });
  });

  const publicSettingKeys = ["login_photo"];
  const authSettingKeys = ["dashboard_photo", "rapporten_photo"];

  app.get("/api/site-settings/public/:key", async (req, res) => {
    if (!publicSettingKeys.includes(req.params.key)) {
      return res.status(404).json({ message: "Instelling niet gevonden" });
    }
    const value = await storage.getSiteSetting(req.params.key);
    res.json({ value });
  });

  app.get("/api/site-settings/:key", requireAuth, async (req, res) => {
    const allKeys = [...publicSettingKeys, ...authSettingKeys];
    if (!allKeys.includes(req.params.key)) {
      return res.status(404).json({ message: "Instelling niet gevonden" });
    }
    const value = await storage.getSiteSetting(req.params.key);
    res.json({ value });
  });

  app.post("/api/site-settings/dashboard-photo", requireAuth, uploadImage.single("photo"), async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      const user = await storage.getUser(userId);
      if (!user || !isAdminRole(user.role)) {
        return res.status(403).json({ message: "Alleen beheerders" });
      }
      if (!req.file) {
        return res.status(400).json({ message: "Geen afbeelding geüpload" });
      }
      const photoUrl = `/uploads/App_pics/${req.file.filename}`;
      await storage.setSiteSetting("dashboard_photo", photoUrl);
      res.json({ value: photoUrl });
    } catch (err: any) {
      res.status(400).json({ message: err.message || "Upload mislukt" });
    }
  });

  app.post("/api/site-settings/login-photo", requireAuth, uploadImage.single("photo"), async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      const user = await storage.getUser(userId);
      if (!user || !isAdminRole(user.role)) {
        return res.status(403).json({ message: "Alleen beheerders" });
      }
      if (!req.file) {
        return res.status(400).json({ message: "Geen afbeelding geüpload" });
      }
      const photoUrl = `/uploads/App_pics/${req.file.filename}`;
      await storage.setSiteSetting("login_photo", photoUrl);
      res.json({ value: photoUrl });
    } catch (err: any) {
      res.status(400).json({ message: err.message || "Upload mislukt" });
    }
  });

  app.post("/api/site-settings/rapporten-photo", requireAuth, uploadImage.single("photo"), async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      const user = await storage.getUser(userId);
      if (!user || !isAdminRole(user.role)) {
        return res.status(403).json({ message: "Alleen beheerders" });
      }
      if (!req.file) {
        return res.status(400).json({ message: "Geen afbeelding geüpload" });
      }
      const photoUrl = `/uploads/App_pics/${req.file.filename}`;
      await storage.setSiteSetting("rapporten_photo", photoUrl);
      res.json({ value: photoUrl });
    } catch (err: any) {
      res.status(400).json({ message: err.message || "Upload mislukt" });
    }
  });

  app.get("/api/jaarplan", requireAuth, async (req, res) => {
    const year = parseInt(req.query.year as string) || new Date().getFullYear();
    const items = await storage.getJaarplanItemsByYear(year);
    res.json(items);
  });

  app.get("/api/jaarplan/mine", requireAuth, async (req, res) => {
    const items = await storage.getJaarplanItemsByUser((req as any).user.id);
    res.json(items);
  });

  app.post("/api/jaarplan", requireAuth, async (req, res) => {
    if (!isAdminRole((req as any).user.role)) {
      return res.status(403).json({ message: "Geen toegang" });
    }
    try {
      const { editId, ...rest } = req.body;
      const parsed = insertJaarplanItemSchema.parse(rest);
      if (editId) {
        const updated = await storage.updateJaarplanItem(editId, parsed);
        res.json(updated);
      } else {
        const item = await storage.createJaarplanItem(parsed);
        res.json(item);
      }
    } catch (err: any) {
      res.status(400).json({ message: err.message || "Validatiefout" });
    }
  });

  app.put("/api/jaarplan/:id", requireAuth, async (req, res) => {
    if (!isAdminRole((req as any).user.role)) {
      return res.status(403).json({ message: "Geen toegang" });
    }
    try {
      const updated = await storage.updateJaarplanItem(req.params.id, req.body);
      res.json(updated);
    } catch (err: any) {
      res.status(400).json({ message: err.message || "Bijwerken mislukt" });
    }
  });

  app.delete("/api/jaarplan/:id", requireAuth, async (req, res) => {
    if (!isAdminRole((req as any).user.role)) {
      return res.status(403).json({ message: "Geen toegang" });
    }
    await storage.deleteJaarplanItem(req.params.id);
    res.json({ success: true });
  });

  app.get("/api/help-content", requireAuth, async (_req, res) => {
    const items = await storage.getAllHelpContent();
    res.json(items);
  });

  app.put("/api/help-content", requireAuth, async (req, res) => {
    if (!isAdminRole((req as any).user.role)) {
      return res.status(403).json({ message: "Geen toegang" });
    }
    try {
      const { pageRoute, title, content } = req.body;
      if (!pageRoute || !title || !content) {
        return res.status(400).json({ message: "Alle velden zijn verplicht" });
      }
      const updated = await storage.upsertHelpContent({ pageRoute, title, content });
      res.json(updated);
    } catch (err: any) {
      res.status(400).json({ message: err.message || "Fout bij opslaan" });
    }
  });

  app.get("/api/kartografie-productie", async (req, res) => {
    if (!req.session?.userId) return res.status(401).json({ message: "Niet ingelogd" });
    try {
      const [kpRows, mpkRows, samRows] = await Promise.all([
        storage.getKartografieProductie(),
        storage.getAllMaandProdKartograaf(),
        storage.getAllMaandProdSamenvatting(),
      ]);
      const MAAND_AFB = ["Jan","Feb","Mrt","Apr","Mei","Jun","Jul","Aug","Sep","Okt","Nov","Dec"];
      // Bestaande (jaar, maandNaam) sleutels in kartografie_productie
      const kpKeys = new Set(kpRows.map(r => `${r.jaar}-${r.maand}`));
      const prod = (r: { mbr: number; kad_spl: number; gr_uitz: number }) => r.mbr + r.kad_spl + r.gr_uitz;
      const extraRows: (typeof kpRows[0])[] = samRows
        .filter(s => {
          const maandNaam = MAAND_AFB[s.maand - 1];
          return maandNaam && !kpKeys.has(`${s.jaar}-${maandNaam}`);
        })
        .map(s => {
          const maandNaam = MAAND_AFB[s.maand - 1]!;
          const kRows = mpkRows.filter(r => r.jaar === s.jaar && r.maand === s.maand && r.kartograaf !== "afgeboekt_stukken");
          const totAf = kRows.reduce((acc, r) => acc + prod(r), 0);
          const aantalKart = s.aantal_kartografen || 1;
          return { id: 0, jaar: s.jaar, maand: maandNaam, binnengekomen: s.binnengekomen, afgehandeld: totAf, gemiddeld: aantalKart > 0 ? +((totAf / aantalKart) * 10).toFixed(1) : 0, kartografen: s.aantal_kartografen };
        });
      res.json([...kpRows, ...extraRows].sort((a, b) => a.jaar !== b.jaar ? a.jaar - b.jaar : MAAND_AFB.indexOf(a.maand) - MAAND_AFB.indexOf(b.maand)));
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Fout bij ophalen" });
    }
  });

  app.post("/api/kartografie-productie/import", async (req, res) => {
    const user = (req as any).user;
    if (!user || (!isAdminRole(user.role) && user.role !== "manager")) return res.status(403).json({ message: "Alleen beheerders of managers" });
    try {
      const { rows } = req.body;
      if (!Array.isArray(rows) || rows.length === 0) {
        return res.status(400).json({ message: "Geen geldige rijen" });
      }
      const parsed = rows.map((r: unknown) => insertKartografieProductieSchema.parse(r));
      const result = await storage.bulkUpsertKartografieProductie(parsed);
      res.json({ imported: result.length, rows: result });
    } catch (err: any) {
      res.status(400).json({ message: err.message || "Fout bij importeren" });
    }
  });

  app.delete("/api/kartografie-productie/:jaar", async (req, res) => {
    const user = (req as any).user;
    if (!user || (!isAdminRole(user.role) && user.role !== "manager")) return res.status(403).json({ message: "Alleen beheerders of managers" });
    const jaar = parseInt(req.params.jaar);
    if (isNaN(jaar)) return res.status(400).json({ message: "Ongeldig jaar" });
    try {
      await storage.deleteKartografieProductieByJaar(jaar);
      res.json({ message: "Verwijderd" });
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Fout bij verwijderen" });
    }
  });

  // ── Maandelijkse productie kartografen ──────────────────────────────────
  app.get("/api/maand-prod-kartograaf", async (req, res) => {
    if (!req.session?.userId) return res.status(401).json({ message: "Niet ingelogd" });
    const jaar = parseInt(req.query.jaar as string) || new Date().getFullYear();
    const maand = parseInt(req.query.maand as string) || new Date().getMonth() + 1;
    try {
      const [kartografen, samenvatting] = await Promise.all([
        storage.getMaandProdKartograaf(jaar, maand),
        storage.getMaandProdSamenvatting(jaar, maand),
      ]);
      res.json({ kartografen, samenvatting: samenvatting ?? null });
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Fout bij ophalen" });
    }
  });

  app.get("/api/maand-prod-kartograaf/jaar/:jaar", async (req, res) => {
    if (!req.session?.userId) return res.status(401).json({ message: "Niet ingelogd" });
    const jaar = parseInt(req.params.jaar);
    if (isNaN(jaar)) return res.status(400).json({ message: "Ongeldig jaar" });
    try {
      const rows = await storage.getMaandProdKartograafJaar(jaar);
      res.json(rows);
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Fout bij ophalen" });
    }
  });

  app.post("/api/maand-prod-kartograaf", async (req, res) => {
    if (!req.session?.userId) return res.status(401).json({ message: "Niet ingelogd" });
    const { jaar, maand, kartografen, samenvatting } = req.body;
    if (!jaar || !maand || !Array.isArray(kartografen)) {
      return res.status(400).json({ message: "Ongeldige data" });
    }
    try {
      const parsedRows = kartografen.map((r: unknown) =>
        insertMaandProdKartograafSchema.parse(r)
      );
      await storage.saveMaandProdKartograaf(parsedRows);
      const parsedSam = insertMaandProdSamenvattingSchema.parse(samenvatting);
      const savedSam = await storage.saveMaandProdSamenvatting(parsedSam);

      // ── Write-through: sync naar trend_kartografen_hist en kartografie_productie ──
      const MAAND_AFKORTINGEN = ["Jan","Feb","Mrt","Apr","Mei","Jun","Jul","Aug","Sep","Okt","Nov","Dec"];
      const maandNaam = MAAND_AFKORTINGEN[parsedSam.maand - 1] ?? "Onb";

      // Prod = mbr + kad_spl + gr_uitz (excl. ex_pl, plot_coor, losse_mbr)
      const prod = (r: { mbr: number; kad_spl: number; gr_uitz: number }) => r.mbr + r.kad_spl + r.gr_uitz;

      // Normaliseer kartograaf-naam naar sleutel (verwijder punten en spaties)
      // "E. Galeano" → "egaleano", "J. Pieters" → "jpieters", "N. Sambo" → "nsambo"
      const toKey = (naam: string): string => naam.toLowerCase().replace(/[.\s]+/g, "");

      const actieveRijen = parsedRows.filter(r => r.kartograaf !== "afgeboekt_stukken");
      const totAfgehandeld = actieveRijen.reduce((s, r) => s + prod(r), 0);

      const getProd = (key: string) => {
        const match = actieveRijen.find(r => toKey(r.kartograaf) === key || r.kartograaf.toLowerCase().includes(key.replace(/j|e|n/, "")));
        return match ? prod(match) : 0;
      };

      // Upsert trend_kartografen_hist (per maand, niet bulk-delete)
      await storage.upsertTrendKartografenHistRow(insertTrendKartografenHistSchema.parse({
        jaar: parsedSam.jaar,
        maand: parsedSam.maand,
        egaleano: getProd("egaleano"),
        jpieters: getProd("jpieters"),
        nsambo: getProd("nsambo"),
        binnengekomen: parsedSam.binnengekomen,
        afgehandeld: totAfgehandeld,
      }));

      // Upsert kartografie_productie
      const aantalKart = parsedSam.aantal_kartografen || 1;
      await storage.bulkUpsertKartografieProductie([insertKartografieProductieSchema.parse({
        jaar: parsedSam.jaar,
        maand: maandNaam,
        binnengekomen: parsedSam.binnengekomen,
        afgehandeld: totAfgehandeld,
        gemiddeld: aantalKart > 0 ? +((totAfgehandeld / aantalKart) * 10).toFixed(1) : 0,
        kartografen: parsedSam.aantal_kartografen,
      })]);

      res.json({ success: true, samenvatting: savedSam });
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Fout bij opslaan" });
    }
  });

  // ── Helper: controleer of gebruiker admin of manager is ─────────────────────
  function isAdminOrManager(user: any): boolean {
    return isAdminRole(user?.role) || user?.role === "manager";
  }

  // ── Maandelijkse productie Landmeters ─────────────────────────────────────
  app.get("/api/maand-prod-landmeter", async (req, res) => {
    if (!req.session?.userId) return res.status(401).json({ message: "Niet ingelogd" });
    const jaar = parseInt(req.query.jaar as string) || new Date().getFullYear();
    const maand = parseInt(req.query.maand as string) || new Date().getMonth() + 1;
    try {
      const [landmeters, samenvatting] = await Promise.all([
        storage.getMaandProdLandmeter(jaar, maand),
        storage.getMaandProdSamenvattingLm(jaar, maand),
      ]);
      res.json({ landmeters, samenvatting: samenvatting ?? null });
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Fout bij ophalen" });
    }
  });

  app.post("/api/maand-prod-landmeter", async (req, res) => {
    if (!req.session?.userId) return res.status(401).json({ message: "Niet ingelogd" });
    const { jaar, maand, landmeters, samenvatting } = req.body;
    if (!jaar || !maand || !Array.isArray(landmeters)) {
      return res.status(400).json({ message: "Ongeldige data" });
    }
    try {
      const parsedRows = landmeters.map((r: unknown) => insertMaandProdLandmeterSchema.parse(r));
      await storage.saveMaandProdLandmeter(parsedRows);
      const parsedSam = insertMaandProdSamenvattingLmSchema.parse(samenvatting);
      const savedSam = await storage.saveMaandProdSamenvattingLm(parsedSam);

      // ── Write-through naar trend_km_buiten ────────────────────────────────
      const totProd = (r: { meting: number; gr_uitz: number }) => r.meting + r.gr_uitz;
      const actieveRijen = parsedRows.filter(r => r.landmeter !== "afgeboekte_stukken");
      const totAfgehandeld = actieveRijen.reduce((s, r) => s + totProd(r), 0);
      const totUitbesteding = actieveRijen.reduce((s, r) => s + r.ex_uitb, 0);
      const aantalLm = parsedSam.aantal_landmeters || 1;
      const gemiddeld = aantalLm > 0 ? +((totAfgehandeld / aantalLm) * 10).toFixed(1) : 0;

      await storage.upsertTrendKmBuitenRow(insertTrendKmBuitenSchema.parse({
        jaar: parsedSam.jaar,
        maand: parsedSam.maand,
        binnengekomen: parsedSam.binnengekomen,
        afgehandeld: totAfgehandeld,
        uitbesteding: totUitbesteding,
        gemiddeld,
        landmeters: parsedSam.aantal_landmeters,
      }));

      res.json({ success: true, samenvatting: savedSam });
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Fout bij opslaan" });
    }
  });

  // ── Trend KM Buiten ──────────────────────────────────────────────────────────
  app.get("/api/trend-km-buiten", async (req, res) => {
    if (!req.session?.userId) return res.status(401).json({ message: "Niet ingelogd" });
    try {
      const [trendRows, lmRows, samRows] = await Promise.all([
        storage.getTrendKmBuiten(),
        storage.getAllMaandProdLandmeter(),
        storage.getAllMaandProdSamenvattingLm(),
      ]);
      const trendKeys = new Set(trendRows.map(r => `${r.jaar}-${r.maand}`));
      const totProd = (r: { meting: number; gr_uitz: number }) => r.meting + r.gr_uitz;
      const extraRows = samRows
        .filter(s => !trendKeys.has(`${s.jaar}-${s.maand}`))
        .map(s => {
          const actief = lmRows.filter(r => r.jaar === s.jaar && r.maand === s.maand && r.landmeter !== "afgeboekte_stukken");
          const totAf = actief.reduce((acc, r) => acc + totProd(r), 0);
          const totUitb = actief.reduce((acc, r) => acc + r.ex_uitb, 0);
          const aantalLm = s.aantal_landmeters || 1;
          return { id: 0, jaar: s.jaar, maand: s.maand, binnengekomen: s.binnengekomen, afgehandeld: totAf, uitbesteding: totUitb, gemiddeld: aantalLm > 0 ? +((totAf / aantalLm) * 10).toFixed(1) : 0, landmeters: s.aantal_landmeters };
        });
      res.json([...trendRows, ...extraRows].sort((a, b) => a.jaar !== b.jaar ? a.jaar - b.jaar : a.maand - b.maand));
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });
  app.post("/api/trend-km-buiten/import", async (req, res) => {
    const user = (req as any).user;
    if (!user || !isAdminOrManager(user)) return res.status(403).json({ message: "Geen toegang" });
    try {
      const { rows } = req.body;
      if (!Array.isArray(rows) || rows.length === 0) return res.status(400).json({ message: "Geen geldige rijen" });
      const parsed = rows.map((r: unknown) => insertTrendKmBuitenSchema.parse(r));
      await storage.bulkUpsertTrendKmBuiten(parsed);
      res.json({ imported: parsed.length });
    } catch (err: any) { res.status(400).json({ message: err.message }); }
  });
  app.delete("/api/trend-km-buiten/:jaar", async (req, res) => {
    const user = (req as any).user;
    if (!user || !isAdminOrManager(user)) return res.status(403).json({ message: "Geen toegang" });
    const jaar = parseInt(req.params.jaar);
    if (isNaN(jaar)) return res.status(400).json({ message: "Ongeldig jaar" });
    try { await storage.deleteTrendKmBuitenByJaar(jaar); res.json({ message: "Verwijderd" }); } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // ── Trend KM Info ─────────────────────────────────────────────────────────────
  app.get("/api/trend-km-info", async (req, res) => {
    if (!req.session?.userId) return res.status(401).json({ message: "Niet ingelogd" });
    try { res.json(await storage.getTrendKmInfo()); } catch (err: any) { res.status(500).json({ message: err.message }); }
  });
  app.post("/api/trend-km-info/import", async (req, res) => {
    const user = (req as any).user;
    if (!user || !isAdminOrManager(user)) return res.status(403).json({ message: "Geen toegang" });
    try {
      const { rows } = req.body;
      if (!Array.isArray(rows) || rows.length === 0) return res.status(400).json({ message: "Geen geldige rijen" });
      const parsed = rows.map((r: unknown) => insertTrendKmInfoSchema.parse(r));
      await storage.bulkUpsertTrendKmInfo(parsed);
      res.json({ imported: parsed.length });
    } catch (err: any) { res.status(400).json({ message: err.message }); }
  });
  app.delete("/api/trend-km-info/:jaar", async (req, res) => {
    const user = (req as any).user;
    if (!user || !isAdminOrManager(user)) return res.status(403).json({ message: "Geen toegang" });
    const jaar = parseInt(req.params.jaar);
    if (isNaN(jaar)) return res.status(400).json({ message: "Ongeldig jaar" });
    try { await storage.deleteTrendKmInfoByJaar(jaar); res.json({ message: "Verwijderd" }); } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // ── Trend OR Info ─────────────────────────────────────────────────────────────
  app.get("/api/trend-or-info", async (req, res) => {
    if (!req.session?.userId) return res.status(401).json({ message: "Niet ingelogd" });
    try { res.json(await storage.getTrendOrInfo()); } catch (err: any) { res.status(500).json({ message: err.message }); }
  });
  app.post("/api/trend-or-info/import", async (req, res) => {
    const user = (req as any).user;
    if (!user || !isAdminOrManager(user)) return res.status(403).json({ message: "Geen toegang" });
    try {
      const { rows } = req.body;
      if (!Array.isArray(rows) || rows.length === 0) return res.status(400).json({ message: "Geen geldige rijen" });
      const parsed = rows.map((r: unknown) => insertTrendOrInfoSchema.parse(r));
      await storage.bulkUpsertTrendOrInfo(parsed);
      res.json({ imported: parsed.length });
    } catch (err: any) { res.status(400).json({ message: err.message }); }
  });
  app.delete("/api/trend-or-info/:jaar", async (req, res) => {
    const user = (req as any).user;
    if (!user || !isAdminOrManager(user)) return res.status(403).json({ message: "Geen toegang" });
    const jaar = parseInt(req.params.jaar);
    if (isNaN(jaar)) return res.status(400).json({ message: "Ongeldig jaar" });
    try { await storage.deleteTrendOrInfoByJaar(jaar); res.json({ message: "Verwijderd" }); } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // ── Trend OR Algemeen ─────────────────────────────────────────────────────────
  app.get("/api/trend-or-algemeen", async (req, res) => {
    if (!req.session?.userId) return res.status(401).json({ message: "Niet ingelogd" });
    try { res.json(await storage.getTrendOrAlgemeen()); } catch (err: any) { res.status(500).json({ message: err.message }); }
  });
  app.post("/api/trend-or-algemeen/import", async (req, res) => {
    const user = (req as any).user;
    if (!user || !isAdminOrManager(user)) return res.status(403).json({ message: "Geen toegang" });
    try {
      const { rows } = req.body;
      if (!Array.isArray(rows) || rows.length === 0) return res.status(400).json({ message: "Geen geldige rijen" });
      const parsed = rows.map((r: unknown) => insertTrendOrAlgemeenSchema.parse(r));
      await storage.bulkUpsertTrendOrAlgemeen(parsed);
      res.json({ imported: parsed.length });
    } catch (err: any) { res.status(400).json({ message: err.message }); }
  });
  app.delete("/api/trend-or-algemeen/:jaar", async (req, res) => {
    const user = (req as any).user;
    if (!user || !isAdminOrManager(user)) return res.status(403).json({ message: "Geen toegang" });
    const jaar = parseInt(req.params.jaar);
    if (isNaN(jaar)) return res.status(400).json({ message: "Ongeldig jaar" });
    try { await storage.deleteTrendOrAlgemeenByJaar(jaar); res.json({ message: "Verwijderd" }); } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // ── Trend OR Notaris ──────────────────────────────────────────────────────────
  app.get("/api/trend-or-notaris", async (req, res) => {
    if (!req.session?.userId) return res.status(401).json({ message: "Niet ingelogd" });
    try { res.json(await storage.getTrendOrNotaris()); } catch (err: any) { res.status(500).json({ message: err.message }); }
  });
  app.post("/api/trend-or-notaris/import", async (req, res) => {
    const user = (req as any).user;
    if (!user || !isAdminOrManager(user)) return res.status(403).json({ message: "Geen toegang" });
    try {
      const { rows } = req.body;
      if (!Array.isArray(rows) || rows.length === 0) return res.status(400).json({ message: "Geen geldige rijen" });
      const parsed = rows.map((r: unknown) => insertTrendOrNotarisSchema.parse(r));
      await storage.bulkUpsertTrendOrNotaris(parsed);
      res.json({ imported: parsed.length });
    } catch (err: any) { res.status(400).json({ message: err.message }); }
  });
  app.delete("/api/trend-or-notaris/:jaar", async (req, res) => {
    const user = (req as any).user;
    if (!user || !isAdminOrManager(user)) return res.status(403).json({ message: "Geen toegang" });
    const jaar = parseInt(req.params.jaar);
    if (isNaN(jaar)) return res.status(400).json({ message: "Ongeldig jaar" });
    try { await storage.deleteTrendOrNotarisByJaar(jaar); res.json({ message: "Verwijderd" }); } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  // ── Trend Kartografen historisch ──────────────────────────────────────────────
  app.get("/api/trend-kartografen-hist", async (req, res) => {
    if (!req.session?.userId) return res.status(401).json({ message: "Niet ingelogd" });
    try {
      const [trendRows, mpkRows, samRows] = await Promise.all([
        storage.getTrendKartografenHist(),
        storage.getAllMaandProdKartograaf(),
        storage.getAllMaandProdSamenvatting(),
      ]);
      // Maak set van bestaande (jaar, maand) sleutels in trend_hist
      const trendKeys = new Set(trendRows.map(r => `${r.jaar}-${r.maand}`));
      // Naam-normalisatie: verwijder punten en spaties
      const toKey = (naam: string) => naam.toLowerCase().replace(/[.\s]+/g, "");
      // Prod = mbr + kad_spl + gr_uitz
      const prod = (r: { mbr: number; kad_spl: number; gr_uitz: number }) => r.mbr + r.kad_spl + r.gr_uitz;
      // Bereken afgeleidde trend-rijen vanuit maand_prod voor ontbrekende (jaar, maand)
      const extraRows = samRows
        .filter(s => !trendKeys.has(`${s.jaar}-${s.maand}`))
        .map(s => {
          const kRows = mpkRows.filter(r => r.jaar === s.jaar && r.maand === s.maand && r.kartograaf !== "afgeboekt_stukken");
          const totAf = kRows.reduce((acc, r) => acc + prod(r), 0);
          const getProd = (key: string) => {
            const match = kRows.find(r => toKey(r.kartograaf) === key || r.kartograaf.toLowerCase().includes(key.slice(1)));
            return match ? prod(match) : 0;
          };
          return { id: 0, jaar: s.jaar, maand: s.maand, egaleano: getProd("egaleano"), jpieters: getProd("jpieters"), nsambo: getProd("nsambo"), binnengekomen: s.binnengekomen, afgehandeld: totAf };
        });
      res.json([...trendRows, ...extraRows].sort((a, b) => a.jaar !== b.jaar ? a.jaar - b.jaar : a.maand - b.maand));
    } catch (err: any) { res.status(500).json({ message: err.message }); }
  });
  app.post("/api/trend-kartografen-hist/import", async (req, res) => {
    const user = (req as any).user;
    if (!user || !isAdminOrManager(user)) return res.status(403).json({ message: "Geen toegang" });
    try {
      const { rows } = req.body;
      if (!Array.isArray(rows) || rows.length === 0) return res.status(400).json({ message: "Geen geldige rijen" });
      const parsed = rows.map((r: unknown) => insertTrendKartografenHistSchema.parse(r));
      await storage.bulkUpsertTrendKartografenHist(parsed);
      res.json({ imported: parsed.length });
    } catch (err: any) { res.status(400).json({ message: err.message }); }
  });
  app.delete("/api/trend-kartografen-hist/:jaar", async (req, res) => {
    const user = (req as any).user;
    if (!user || !isAdminOrManager(user)) return res.status(403).json({ message: "Geen toegang" });
    const jaar = parseInt(req.params.jaar);
    if (isNaN(jaar)) return res.status(400).json({ message: "Ongeldig jaar" });
    try { await storage.deleteTrendKartografenHistByJaar(jaar); res.json({ message: "Verwijderd" }); } catch (err: any) { res.status(500).json({ message: err.message }); }
  });

  return httpServer;
}
