import { db } from "./db";
import { eq, desc, sql, and } from "drizzle-orm";
import {
  users, events, announcements, departments, absences, rewards, applications, appAccess,
  type User, type InsertUser,
  type Event, type InsertEvent,
  type Announcement, type InsertAnnouncement,
  type Department, type InsertDepartment,
  type Absence, type InsertAbsence,
  type Reward, type InsertReward,
  type Application, type InsertApplication,
  type AppAccess, type InsertAppAccess,
} from "@shared/schema";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUsers(): Promise<User[]>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, data: Partial<InsertUser>): Promise<User>;
  deleteUser(id: string): Promise<void>;

  getEvents(): Promise<Event[]>;
  createEvent(event: InsertEvent): Promise<Event>;
  updateEvent(id: string, data: Partial<InsertEvent>): Promise<Event>;
  deleteEvent(id: string): Promise<void>;

  getAnnouncements(): Promise<Announcement[]>;
  createAnnouncement(ann: InsertAnnouncement): Promise<Announcement>;
  updateAnnouncement(id: string, data: Partial<InsertAnnouncement>): Promise<Announcement>;
  deleteAnnouncement(id: string): Promise<void>;

  getDepartments(): Promise<Department[]>;
  createDepartment(dept: InsertDepartment): Promise<Department>;
  updateDepartment(id: string, data: Partial<InsertDepartment>): Promise<Department>;
  deleteDepartment(id: string): Promise<void>;

  getAbsences(): Promise<(Absence & { userName?: string })[]>;
  getAbsencesByUser(userId: string): Promise<(Absence & { userName?: string })[]>;
  createAbsence(absence: InsertAbsence): Promise<Absence>;
  updateAbsenceStatus(id: string, status: string, approvedBy: string | null): Promise<void>;

  getRewards(): Promise<(Reward & { userName?: string })[]>;
  getRewardsByUser(userId: string): Promise<(Reward & { userName?: string })[]>;
  createReward(reward: InsertReward): Promise<Reward>;
  getLeaderboard(): Promise<{ userId: string; userName: string; totalPoints: number }[]>;

  updateUserPermissions(id: string, permissions: string[]): Promise<User>;

  getApplications(): Promise<Application[]>;
  createApplication(app: InsertApplication): Promise<Application>;
  updateApplication(id: string, data: Partial<InsertApplication>): Promise<Application>;
  deleteApplication(id: string): Promise<void>;

  getAppAccess(): Promise<(AppAccess & { userName?: string; appName?: string })[]>;
  createAppAccess(access: InsertAppAccess): Promise<AppAccess>;
  deleteAppAccess(id: string): Promise<void>;

  getDashboardStats(): Promise<{
    totalEmployees: number;
    activeAbsences: number;
    upcomingEvents: number;
    totalRewardPoints: number;
    pendingAbsences: number;
  }>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async getUsers(): Promise<User[]> {
    return db.select().from(users);
  }

  async createUser(user: InsertUser): Promise<User> {
    const [created] = await db.insert(users).values(user).returning();
    return created;
  }

  async updateUser(id: string, data: Partial<InsertUser>): Promise<User> {
    const [updated] = await db.update(users).set(data).where(eq(users.id, id)).returning();
    return updated;
  }

  async deleteUser(id: string): Promise<void> {
    await db.delete(users).where(eq(users.id, id));
  }

  async getEvents(): Promise<Event[]> {
    return db.select().from(events).orderBy(events.date);
  }

  async createEvent(event: InsertEvent): Promise<Event> {
    const [created] = await db.insert(events).values(event).returning();
    return created;
  }

  async updateEvent(id: string, data: Partial<InsertEvent>): Promise<Event> {
    const [updated] = await db.update(events).set(data).where(eq(events.id, id)).returning();
    return updated;
  }

  async deleteEvent(id: string): Promise<void> {
    await db.delete(events).where(eq(events.id, id));
  }

  async getAnnouncements(): Promise<Announcement[]> {
    return db.select().from(announcements).orderBy(desc(announcements.createdAt));
  }

  async createAnnouncement(ann: InsertAnnouncement): Promise<Announcement> {
    const [created] = await db.insert(announcements).values(ann).returning();
    return created;
  }

  async updateAnnouncement(id: string, data: Partial<InsertAnnouncement>): Promise<Announcement> {
    const [updated] = await db.update(announcements).set(data).where(eq(announcements.id, id)).returning();
    return updated;
  }

  async deleteAnnouncement(id: string): Promise<void> {
    await db.delete(announcements).where(eq(announcements.id, id));
  }

  async getDepartments(): Promise<Department[]> {
    return db.select().from(departments);
  }

  async createDepartment(dept: InsertDepartment): Promise<Department> {
    const [created] = await db.insert(departments).values(dept).returning();
    return created;
  }

  async updateDepartment(id: string, data: Partial<InsertDepartment>): Promise<Department> {
    const [updated] = await db.update(departments).set(data).where(eq(departments.id, id)).returning();
    return updated;
  }

  async deleteDepartment(id: string): Promise<void> {
    await db.delete(departments).where(eq(departments.id, id));
  }

  async getAbsences(): Promise<(Absence & { userName?: string })[]> {
    const result = await db
      .select({
        id: absences.id,
        userId: absences.userId,
        type: absences.type,
        startDate: absences.startDate,
        endDate: absences.endDate,
        reason: absences.reason,
        status: absences.status,
        approvedBy: absences.approvedBy,
        userName: users.fullName,
      })
      .from(absences)
      .leftJoin(users, eq(absences.userId, users.id))
      .orderBy(desc(absences.startDate));
    return result as any;
  }

  async getAbsencesByUser(userId: string): Promise<(Absence & { userName?: string })[]> {
    const result = await db
      .select({
        id: absences.id,
        userId: absences.userId,
        type: absences.type,
        startDate: absences.startDate,
        endDate: absences.endDate,
        reason: absences.reason,
        status: absences.status,
        approvedBy: absences.approvedBy,
        userName: users.fullName,
      })
      .from(absences)
      .leftJoin(users, eq(absences.userId, users.id))
      .where(eq(absences.userId, userId))
      .orderBy(desc(absences.startDate));
    return result as any;
  }

  async createAbsence(absence: InsertAbsence): Promise<Absence> {
    const [created] = await db.insert(absences).values(absence).returning();
    return created;
  }

  async updateAbsenceStatus(id: string, status: string, approvedBy: string | null): Promise<void> {
    await db.update(absences).set({ status: status as any, approvedBy }).where(eq(absences.id, id));
  }

  async getRewards(): Promise<(Reward & { userName?: string })[]> {
    const result = await db
      .select({
        id: rewards.id,
        userId: rewards.userId,
        points: rewards.points,
        reason: rewards.reason,
        awardedBy: rewards.awardedBy,
        awardedAt: rewards.awardedAt,
        userName: users.fullName,
      })
      .from(rewards)
      .leftJoin(users, eq(rewards.userId, users.id))
      .orderBy(desc(rewards.awardedAt));
    return result as any;
  }

  async getRewardsByUser(userId: string): Promise<(Reward & { userName?: string })[]> {
    const result = await db
      .select({
        id: rewards.id,
        userId: rewards.userId,
        points: rewards.points,
        reason: rewards.reason,
        awardedBy: rewards.awardedBy,
        awardedAt: rewards.awardedAt,
        userName: users.fullName,
      })
      .from(rewards)
      .leftJoin(users, eq(rewards.userId, users.id))
      .where(eq(rewards.userId, userId))
      .orderBy(desc(rewards.awardedAt));
    return result as any;
  }

  async createReward(reward: InsertReward): Promise<Reward> {
    const [created] = await db.insert(rewards).values(reward).returning();
    return created;
  }

  async getLeaderboard(): Promise<{ userId: string; userName: string; totalPoints: number }[]> {
    const result = await db
      .select({
        userId: rewards.userId,
        userName: users.fullName,
        totalPoints: sql<number>`sum(${rewards.points})::int`,
      })
      .from(rewards)
      .leftJoin(users, eq(rewards.userId, users.id))
      .groupBy(rewards.userId, users.fullName)
      .orderBy(sql`sum(${rewards.points}) desc`);
    return result as any;
  }

  async updateUserPermissions(id: string, permissions: string[]): Promise<User> {
    const [updated] = await db.update(users).set({ permissions }).where(eq(users.id, id)).returning();
    return updated;
  }

  async getApplications(): Promise<Application[]> {
    return db.select().from(applications);
  }

  async createApplication(app: InsertApplication): Promise<Application> {
    const [created] = await db.insert(applications).values(app).returning();
    return created;
  }

  async updateApplication(id: string, data: Partial<InsertApplication>): Promise<Application> {
    const [updated] = await db.update(applications).set(data).where(eq(applications.id, id)).returning();
    return updated;
  }

  async deleteApplication(id: string): Promise<void> {
    await db.delete(appAccess).where(eq(appAccess.applicationId, id));
    await db.delete(applications).where(eq(applications.id, id));
  }

  async getAppAccess(): Promise<(AppAccess & { userName?: string; appName?: string })[]> {
    const result = await db
      .select({
        id: appAccess.id,
        userId: appAccess.userId,
        applicationId: appAccess.applicationId,
        accessLevel: appAccess.accessLevel,
        grantedAt: appAccess.grantedAt,
        userName: users.fullName,
        appName: applications.name,
      })
      .from(appAccess)
      .leftJoin(users, eq(appAccess.userId, users.id))
      .leftJoin(applications, eq(appAccess.applicationId, applications.id));
    return result as any;
  }

  async createAppAccess(access: InsertAppAccess): Promise<AppAccess> {
    const [created] = await db.insert(appAccess).values(access).returning();
    return created;
  }

  async deleteAppAccess(id: string): Promise<void> {
    await db.delete(appAccess).where(eq(appAccess.id, id));
  }

  async getDashboardStats() {
    const [employeeCount] = await db.select({ count: sql<number>`count(*)::int` }).from(users).where(eq(users.active, true));
    const today = new Date().toISOString().split("T")[0];
    const [activeAbsenceCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(absences)
      .where(and(
        sql`${absences.endDate} >= ${today}`,
        eq(absences.status, "approved")
      ));
    const [pendingAbsenceCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(absences)
      .where(eq(absences.status, "pending"));
    const [eventCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(events)
      .where(sql`${events.date} >= ${today}`);
    const [rewardSum] = await db
      .select({ total: sql<number>`coalesce(sum(${rewards.points}), 0)::int` })
      .from(rewards);

    return {
      totalEmployees: employeeCount?.count || 0,
      activeAbsences: activeAbsenceCount?.count || 0,
      upcomingEvents: eventCount?.count || 0,
      totalRewardPoints: rewardSum?.total || 0,
      pendingAbsences: pendingAbsenceCount?.count || 0,
    };
  }
}

export const storage = new DatabaseStorage();
