import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, date, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const roleEnum = pgEnum("role", ["admin", "manager", "employee"]);
export const absenceTypeEnum = pgEnum("absence_type", ["sick", "vacation", "personal", "other", "bvvd"]);
export const absenceStatusEnum = pgEnum("absence_status", ["pending", "approved", "rejected"]);

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  fullName: text("full_name").notNull(),
  email: text("email").notNull(),
  role: roleEnum("role").notNull().default("employee"),
  department: text("department"),
  avatar: text("avatar"),
  active: boolean("active").notNull().default(true),
  permissions: text("permissions").array(),
  startDate: date("start_date"),
  endDate: date("end_date"),
  birthDate: date("birth_date"),
  vacationDaysTotal: integer("vacation_days_total").default(25),
});

export const events = pgTable("events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description"),
  date: date("date").notNull(),
  endDate: date("end_date"),
  time: text("time"),
  location: text("location"),
  category: text("category"),
  createdBy: varchar("created_by").references(() => users.id),
});

export const announcements = pgTable("announcements", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  content: text("content").notNull(),
  priority: text("priority").notNull().default("normal"),
  pinned: boolean("pinned").notNull().default(false),
  pdfUrl: text("pdf_url"),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const departments = pgTable("departments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(),
  description: text("description"),
  managerId: varchar("manager_id").references(() => users.id),
});

export const absences = pgTable("absences", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  type: absenceTypeEnum("type").notNull(),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  reason: text("reason"),
  bvvdReason: text("bvvd_reason"),
  halfDay: text("half_day"),
  status: absenceStatusEnum("status").notNull().default("pending"),
  approvedBy: varchar("approved_by").references(() => users.id),
});

export const rewards = pgTable("rewards", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  points: integer("points").notNull().default(0),
  reason: text("reason").notNull(),
  awardedBy: varchar("awarded_by").references(() => users.id),
  awardedAt: timestamp("awarded_at").notNull().defaultNow(),
});

export const applications = pgTable("applications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  url: text("url"),
  path: text("path"),
  icon: text("icon"),
});

export const appAccess = pgTable("app_access", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  applicationId: varchar("application_id").references(() => applications.id).notNull(),
  accessLevel: text("access_level").notNull().default("read"),
  grantedAt: timestamp("granted_at").notNull().defaultNow(),
});

export const messages = pgTable("messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  fromUserId: varchar("from_user_id").references(() => users.id).notNull(),
  toUserId: varchar("to_user_id").references(() => users.id).notNull(),
  subject: text("subject").notNull(),
  content: text("content").notNull(),
  reply: text("reply"),
  repliedAt: timestamp("replied_at"),
  read: boolean("read").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const aoProcedures = pgTable("ao_procedures", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  departmentId: varchar("department_id").references(() => departments.id).notNull(),
  title: text("title").notNull(),
  description: text("description"),
});

export const aoInstructions = pgTable("ao_instructions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  procedureId: varchar("procedure_id").references(() => aoProcedures.id).notNull(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const positionHistory = pgTable("position_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  functionTitle: text("function_title").notNull(),
  startDate: date("start_date").notNull(),
  endDate: date("end_date"),
  salary: integer("salary"),
  notes: text("notes"),
});

export const personalDevelopment = pgTable("personal_development", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  trainingName: text("training_name").notNull(),
  startDate: date("start_date").notNull(),
  endDate: date("end_date"),
  completed: boolean("completed").notNull().default(false),
});

export const legislationLinks = pgTable("legislation_links", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  url: text("url").notNull(),
  description: text("description"),
  category: text("category").notNull().default("algemeen"),
});

export const insertUserSchema = createInsertSchema(users).omit({ id: true });
export const insertEventSchema = createInsertSchema(events).omit({ id: true });
export const insertAnnouncementSchema = createInsertSchema(announcements).omit({ id: true, createdAt: true });
export const insertDepartmentSchema = createInsertSchema(departments).omit({ id: true });
export const insertAbsenceSchema = createInsertSchema(absences).omit({ id: true });
export const insertRewardSchema = createInsertSchema(rewards).omit({ id: true, awardedAt: true });
export const insertApplicationSchema = createInsertSchema(applications).omit({ id: true });
export const insertAppAccessSchema = createInsertSchema(appAccess).omit({ id: true, grantedAt: true });
export const insertMessageSchema = createInsertSchema(messages).omit({ id: true, createdAt: true, reply: true, repliedAt: true, read: true });
export const insertAoProcedureSchema = createInsertSchema(aoProcedures).omit({ id: true });
export const insertAoInstructionSchema = createInsertSchema(aoInstructions).omit({ id: true });
export const insertPositionHistorySchema = createInsertSchema(positionHistory).omit({ id: true });
export const insertPersonalDevelopmentSchema = createInsertSchema(personalDevelopment).omit({ id: true });
export const insertLegislationLinkSchema = createInsertSchema(legislationLinks).omit({ id: true });

export const loginSchema = z.object({
  username: z.string().min(1, "Gebruikersnaam is verplicht"),
  password: z.string().min(1, "Wachtwoord is verplicht"),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertEvent = z.infer<typeof insertEventSchema>;
export type Event = typeof events.$inferSelect;
export type InsertAnnouncement = z.infer<typeof insertAnnouncementSchema>;
export type Announcement = typeof announcements.$inferSelect;
export type InsertDepartment = z.infer<typeof insertDepartmentSchema>;
export type Department = typeof departments.$inferSelect;
export type InsertAbsence = z.infer<typeof insertAbsenceSchema>;
export type Absence = typeof absences.$inferSelect;
export type InsertReward = z.infer<typeof insertRewardSchema>;
export type Reward = typeof rewards.$inferSelect;
export type InsertApplication = z.infer<typeof insertApplicationSchema>;
export type Application = typeof applications.$inferSelect;
export type InsertAppAccess = z.infer<typeof insertAppAccessSchema>;
export type AppAccess = typeof appAccess.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messages.$inferSelect;
export type InsertAoProcedure = z.infer<typeof insertAoProcedureSchema>;
export type AoProcedure = typeof aoProcedures.$inferSelect;
export type InsertAoInstruction = z.infer<typeof insertAoInstructionSchema>;
export type AoInstruction = typeof aoInstructions.$inferSelect;
export type InsertPositionHistory = z.infer<typeof insertPositionHistorySchema>;
export type PositionHistory = typeof positionHistory.$inferSelect;
export type InsertPersonalDevelopment = z.infer<typeof insertPersonalDevelopmentSchema>;
export type PersonalDevelopment = typeof personalDevelopment.$inferSelect;
export type InsertLegislationLink = z.infer<typeof insertLegislationLinkSchema>;
export type LegislationLink = typeof legislationLinks.$inferSelect;
