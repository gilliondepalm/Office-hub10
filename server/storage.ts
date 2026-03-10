import { db } from "./db";
import { eq, desc, sql, and } from "drizzle-orm";
import {
  users, events, announcements, departments, absences, rewards, applications, appAccess, messages,
  aoProcedures, aoInstructions, positionHistory, personalDevelopment, legislationLinks, caoDocuments, siteSettings,
  functioneringReviews, competencies, beoordelingReviews, beoordelingScores, jaarplanItems,
  type User, type InsertUser,
  type Event, type InsertEvent,
  type Announcement, type InsertAnnouncement,
  type Department, type InsertDepartment,
  type Absence, type InsertAbsence,
  type Reward, type InsertReward,
  type Application, type InsertApplication,
  type AppAccess, type InsertAppAccess,
  type Message, type InsertMessage,
  type AoProcedure, type InsertAoProcedure,
  type AoInstruction, type InsertAoInstruction,
  type PositionHistory, type InsertPositionHistory,
  type PersonalDevelopment, type InsertPersonalDevelopment,
  type LegislationLink, type InsertLegislationLink,
  type CaoDocument, type InsertCaoDocument,
  type FunctioneringReview, type InsertFunctioneringReview,
  type Competency, type InsertCompetency,
  type BeoordelingReview, type InsertBeoordelingReview,
  type BeoordelingScore, type InsertBeoordelingScore,
  type JaarplanItem, type InsertJaarplanItem,
  type HelpContent, type InsertHelpContent,
  type OfficialHoliday, type InsertOfficialHoliday,
  type Snipperdag, type InsertSnipperdag,
  helpContentTable, officialHolidays, snipperdagen,
} from "@shared/schema";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
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

  getAbsences(): Promise<(Absence & { userName?: string; userDepartment?: string | null; userRole?: string })[]>;
  getAbsencesByUser(userId: string): Promise<(Absence & { userName?: string; userDepartment?: string | null; userRole?: string })[]>;
  getAbsencesByDepartment(department: string): Promise<(Absence & { userName?: string; userDepartment?: string | null; userRole?: string })[]>;
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

  getMessagesByUser(userId: string): Promise<(Message & { fromUserName?: string; toUserName?: string })[]>;
  createMessage(msg: InsertMessage): Promise<Message>;
  replyToMessage(id: string, reply: string): Promise<Message>;
  markMessageRead(id: string): Promise<void>;

  getAoProcedures(): Promise<(AoProcedure & { departmentName?: string })[]>;
  getAoProceduresByDepartment(departmentId: string): Promise<AoProcedure[]>;
  createAoProcedure(proc: InsertAoProcedure): Promise<AoProcedure>;
  deleteAoProcedure(id: string): Promise<void>;

  getAoInstructions(procedureId: string): Promise<AoInstruction[]>;
  createAoInstruction(instr: InsertAoInstruction): Promise<AoInstruction>;
  deleteAoInstruction(id: string): Promise<void>;

  getPositionHistoryByUser(userId: string): Promise<PositionHistory[]>;
  getPositionHistoryAll(): Promise<(PositionHistory & { userName?: string })[]>;
  createPositionHistory(entry: InsertPositionHistory): Promise<PositionHistory>;
  updatePositionHistory(id: string, data: Partial<InsertPositionHistory>): Promise<PositionHistory>;
  deletePositionHistory(id: string): Promise<void>;

  getPersonalDevelopmentByUser(userId: string): Promise<PersonalDevelopment[]>;
  createPersonalDevelopment(entry: InsertPersonalDevelopment): Promise<PersonalDevelopment>;
  updatePersonalDevelopment(id: string, data: Partial<InsertPersonalDevelopment>): Promise<PersonalDevelopment>;
  deletePersonalDevelopment(id: string): Promise<void>;

  getLegislationLinks(): Promise<LegislationLink[]>;
  createLegislationLink(link: InsertLegislationLink): Promise<LegislationLink>;
  deleteLegislationLink(id: string): Promise<void>;

  getCaoDocuments(): Promise<CaoDocument[]>;
  createCaoDocument(doc: InsertCaoDocument): Promise<CaoDocument>;
  deleteCaoDocument(id: string): Promise<void>;

  getSiteSetting(key: string): Promise<string | null>;
  setSiteSetting(key: string, value: string): Promise<void>;

  getFunctioneringReviews(): Promise<(FunctioneringReview & { userName?: string })[]>;
  getFunctioneringReviewsByUser(userId: string): Promise<FunctioneringReview[]>;
  getFunctioneringReviewsByYear(year: number): Promise<(FunctioneringReview & { userName?: string })[]>;
  getFunctioneringReviewByUserAndYear(userId: string, year: number): Promise<FunctioneringReview | undefined>;
  createFunctioneringReview(review: InsertFunctioneringReview): Promise<FunctioneringReview>;
  updateFunctioneringReview(id: string, data: Partial<InsertFunctioneringReview>): Promise<FunctioneringReview>;
  deleteFunctioneringReview(id: string): Promise<void>;

  getCompetenciesByFunctie(functie: string): Promise<Competency[]>;
  getAllCompetencies(): Promise<Competency[]>;
  createCompetency(comp: InsertCompetency): Promise<Competency>;
  updateCompetency(id: string, data: Partial<InsertCompetency>): Promise<Competency>;
  deleteCompetency(id: string): Promise<void>;

  getBeoordelingReviews(): Promise<(BeoordelingReview & { userName?: string })[]>;
  getBeoordelingReviewsByUser(userId: string): Promise<BeoordelingReview[]>;
  getBeoordelingReviewsByYear(year: number): Promise<(BeoordelingReview & { userName?: string })[]>;
  getBeoordelingReviewByUserAndYear(userId: string, year: number): Promise<BeoordelingReview | undefined>;
  createBeoordelingReview(review: InsertBeoordelingReview): Promise<BeoordelingReview>;
  updateBeoordelingReview(id: string, data: Partial<InsertBeoordelingReview>): Promise<BeoordelingReview>;
  deleteBeoordelingReview(id: string): Promise<void>;

  getBeoordelingScoresByReview(reviewId: string): Promise<(BeoordelingScore & { competencyName?: string })[]>;
  createBeoordelingScore(score: InsertBeoordelingScore): Promise<BeoordelingScore>;
  updateBeoordelingScore(id: string, data: Partial<InsertBeoordelingScore>): Promise<BeoordelingScore>;
  deleteBeoordelingScoresByReview(reviewId: string): Promise<void>;

  getJaarplanItemsByYear(year: number): Promise<(JaarplanItem & { userName?: string })[]>;
  getJaarplanItemsByUser(userId: string): Promise<(JaarplanItem & { userName?: string })[]>;
  createJaarplanItem(item: InsertJaarplanItem): Promise<JaarplanItem>;
  updateJaarplanItem(id: string, data: Partial<InsertJaarplanItem>): Promise<JaarplanItem>;
  deleteJaarplanItem(id: string): Promise<void>;

  getAllHelpContent(): Promise<HelpContent[]>;
  upsertHelpContent(data: InsertHelpContent): Promise<HelpContent>;

  getOfficialHolidays(year?: number): Promise<OfficialHoliday[]>;
  createOfficialHoliday(holiday: InsertOfficialHoliday): Promise<OfficialHoliday>;
  deleteOfficialHoliday(id: string): Promise<void>;
  deleteOfficialHolidaysByYear(year: number): Promise<void>;

  getSnipperdagen(year?: number): Promise<Snipperdag[]>;
  createSnipperdag(snipperdag: InsertSnipperdag): Promise<Snipperdag>;
  deleteSnipperdag(id: string): Promise<void>;
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

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
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

  async getAbsences(): Promise<(Absence & { userName?: string; userDepartment?: string | null; userRole?: string })[]> {
    const result = await db
      .select({
        id: absences.id,
        userId: absences.userId,
        type: absences.type,
        startDate: absences.startDate,
        endDate: absences.endDate,
        reason: absences.reason,
        bvvdReason: absences.bvvdReason,
        halfDay: absences.halfDay,
        status: absences.status,
        approvedBy: absences.approvedBy,
        userName: users.fullName,
        userDepartment: users.department,
        userRole: users.role,
      })
      .from(absences)
      .leftJoin(users, eq(absences.userId, users.id))
      .orderBy(desc(absences.startDate));
    return result as any;
  }

  async getAbsencesByUser(userId: string): Promise<(Absence & { userName?: string; userDepartment?: string | null; userRole?: string })[]> {
    const result = await db
      .select({
        id: absences.id,
        userId: absences.userId,
        type: absences.type,
        startDate: absences.startDate,
        endDate: absences.endDate,
        reason: absences.reason,
        bvvdReason: absences.bvvdReason,
        halfDay: absences.halfDay,
        status: absences.status,
        approvedBy: absences.approvedBy,
        userName: users.fullName,
        userDepartment: users.department,
        userRole: users.role,
      })
      .from(absences)
      .leftJoin(users, eq(absences.userId, users.id))
      .where(eq(absences.userId, userId))
      .orderBy(desc(absences.startDate));
    return result as any;
  }

  async getAbsencesByDepartment(department: string): Promise<(Absence & { userName?: string; userDepartment?: string | null; userRole?: string })[]> {
    const result = await db
      .select({
        id: absences.id,
        userId: absences.userId,
        type: absences.type,
        startDate: absences.startDate,
        endDate: absences.endDate,
        reason: absences.reason,
        bvvdReason: absences.bvvdReason,
        halfDay: absences.halfDay,
        status: absences.status,
        approvedBy: absences.approvedBy,
        userName: users.fullName,
        userDepartment: users.department,
        userRole: users.role,
      })
      .from(absences)
      .leftJoin(users, eq(absences.userId, users.id))
      .where(eq(users.department, department))
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

  async getMessagesByUser(userId: string): Promise<(Message & { fromUserName?: string; toUserName?: string })[]> {
    const { alias } = await import("drizzle-orm/pg-core");
    const { or } = await import("drizzle-orm");
    const fromUser = alias(users, "from_user");
    const toUser = alias(users, "to_user");
    const result = await db
      .select({
        id: messages.id,
        fromUserId: messages.fromUserId,
        toUserId: messages.toUserId,
        subject: messages.subject,
        content: messages.content,
        reply: messages.reply,
        repliedAt: messages.repliedAt,
        read: messages.read,
        createdAt: messages.createdAt,
        fromUserName: fromUser.fullName,
        toUserName: toUser.fullName,
      })
      .from(messages)
      .leftJoin(fromUser, eq(messages.fromUserId, fromUser.id))
      .leftJoin(toUser, eq(messages.toUserId, toUser.id))
      .where(or(eq(messages.fromUserId, userId), eq(messages.toUserId, userId)))
      .orderBy(desc(messages.createdAt));
    return result as any;
  }

  async createMessage(msg: InsertMessage): Promise<Message> {
    const [created] = await db.insert(messages).values(msg).returning();
    return created;
  }

  async replyToMessage(id: string, reply: string): Promise<Message> {
    const [updated] = await db.update(messages).set({ reply, repliedAt: new Date() }).where(eq(messages.id, id)).returning();
    return updated;
  }

  async markMessageRead(id: string): Promise<void> {
    await db.update(messages).set({ read: true }).where(eq(messages.id, id));
  }

  async getAoProcedures(): Promise<(AoProcedure & { departmentName?: string })[]> {
    const result = await db
      .select({
        id: aoProcedures.id,
        departmentId: aoProcedures.departmentId,
        title: aoProcedures.title,
        description: aoProcedures.description,
        departmentName: departments.name,
      })
      .from(aoProcedures)
      .leftJoin(departments, eq(aoProcedures.departmentId, departments.id));
    return result as any;
  }

  async getAoProceduresByDepartment(departmentId: string): Promise<AoProcedure[]> {
    return db.select().from(aoProcedures).where(eq(aoProcedures.departmentId, departmentId));
  }

  async createAoProcedure(proc: InsertAoProcedure): Promise<AoProcedure> {
    const [created] = await db.insert(aoProcedures).values(proc).returning();
    return created;
  }

  async deleteAoProcedure(id: string): Promise<void> {
    await db.delete(aoInstructions).where(eq(aoInstructions.procedureId, id));
    await db.delete(aoProcedures).where(eq(aoProcedures.id, id));
  }

  async getAoInstructions(procedureId: string): Promise<AoInstruction[]> {
    return db.select().from(aoInstructions).where(eq(aoInstructions.procedureId, procedureId)).orderBy(aoInstructions.sortOrder);
  }

  async createAoInstruction(instr: InsertAoInstruction): Promise<AoInstruction> {
    const [created] = await db.insert(aoInstructions).values(instr).returning();
    return created;
  }

  async deleteAoInstruction(id: string): Promise<void> {
    await db.delete(aoInstructions).where(eq(aoInstructions.id, id));
  }

  async getPositionHistoryByUser(userId: string): Promise<PositionHistory[]> {
    return db.select().from(positionHistory).where(eq(positionHistory.userId, userId)).orderBy(desc(positionHistory.startDate));
  }

  async getPositionHistoryAll(): Promise<(PositionHistory & { userName?: string })[]> {
    const result = await db
      .select({
        id: positionHistory.id,
        userId: positionHistory.userId,
        functionTitle: positionHistory.functionTitle,
        startDate: positionHistory.startDate,
        endDate: positionHistory.endDate,
        salary: positionHistory.salary,
        notes: positionHistory.notes,
        userName: users.fullName,
      })
      .from(positionHistory)
      .leftJoin(users, eq(positionHistory.userId, users.id))
      .orderBy(desc(positionHistory.startDate));
    return result as any;
  }

  async createPositionHistory(entry: InsertPositionHistory): Promise<PositionHistory> {
    const [created] = await db.insert(positionHistory).values(entry).returning();
    return created;
  }

  async updatePositionHistory(id: string, data: Partial<InsertPositionHistory>): Promise<PositionHistory> {
    const [updated] = await db.update(positionHistory).set(data).where(eq(positionHistory.id, id)).returning();
    return updated;
  }

  async deletePositionHistory(id: string): Promise<void> {
    await db.delete(positionHistory).where(eq(positionHistory.id, id));
  }

  async getPersonalDevelopmentByUser(userId: string): Promise<PersonalDevelopment[]> {
    return db.select().from(personalDevelopment).where(eq(personalDevelopment.userId, userId)).orderBy(desc(personalDevelopment.startDate));
  }

  async createPersonalDevelopment(entry: InsertPersonalDevelopment): Promise<PersonalDevelopment> {
    const [created] = await db.insert(personalDevelopment).values(entry).returning();
    return created;
  }

  async updatePersonalDevelopment(id: string, data: Partial<InsertPersonalDevelopment>): Promise<PersonalDevelopment> {
    const [updated] = await db.update(personalDevelopment).set(data).where(eq(personalDevelopment.id, id)).returning();
    return updated;
  }

  async deletePersonalDevelopment(id: string): Promise<void> {
    await db.delete(personalDevelopment).where(eq(personalDevelopment.id, id));
  }

  async getLegislationLinks(): Promise<LegislationLink[]> {
    return db.select().from(legislationLinks);
  }

  async createLegislationLink(link: InsertLegislationLink): Promise<LegislationLink> {
    const [created] = await db.insert(legislationLinks).values(link).returning();
    return created;
  }

  async deleteLegislationLink(id: string): Promise<void> {
    await db.delete(legislationLinks).where(eq(legislationLinks.id, id));
  }

  async getCaoDocuments(): Promise<CaoDocument[]> {
    return db.select().from(caoDocuments);
  }

  async createCaoDocument(doc: InsertCaoDocument): Promise<CaoDocument> {
    const [created] = await db.insert(caoDocuments).values(doc).returning();
    return created;
  }

  async deleteCaoDocument(id: string): Promise<void> {
    await db.delete(caoDocuments).where(eq(caoDocuments.id, id));
  }

  async getSiteSetting(key: string): Promise<string | null> {
    const [row] = await db.select().from(siteSettings).where(eq(siteSettings.key, key));
    return row?.value ?? null;
  }

  async setSiteSetting(key: string, value: string): Promise<void> {
    await db
      .insert(siteSettings)
      .values({ key, value, updatedAt: new Date() })
      .onConflictDoUpdate({ target: siteSettings.key, set: { value, updatedAt: new Date() } });
  }

  async getFunctioneringReviews(): Promise<(FunctioneringReview & { userName?: string })[]> {
    const result = await db
      .select({
        id: functioneringReviews.id,
        userId: functioneringReviews.userId,
        year: functioneringReviews.year,
        medewerker: functioneringReviews.medewerker,
        functie: functioneringReviews.functie,
        afdeling: functioneringReviews.afdeling,
        leidinggevende: functioneringReviews.leidinggevende,
        datum: functioneringReviews.datum,
        periode: functioneringReviews.periode,
        terugblikTaken: functioneringReviews.terugblikTaken,
        terugblikResultaten: functioneringReviews.terugblikResultaten,
        terugblikKnelpunten: functioneringReviews.terugblikKnelpunten,
        werkinhoud: functioneringReviews.werkinhoud,
        samenwerking: functioneringReviews.samenwerking,
        communicatie: functioneringReviews.communicatie,
        leidinggeven: functioneringReviews.leidinggeven,
        arbeidsomstandigheden: functioneringReviews.arbeidsomstandigheden,
        persoonlijkeOntwikkeling: functioneringReviews.persoonlijkeOntwikkeling,
        scholingswensen: functioneringReviews.scholingswensen,
        loopbaanwensen: functioneringReviews.loopbaanwensen,
        doelstelling1: functioneringReviews.doelstelling1,
        doelstelling1Termijn: functioneringReviews.doelstelling1Termijn,
        doelstelling2: functioneringReviews.doelstelling2,
        doelstelling2Termijn: functioneringReviews.doelstelling2Termijn,
        doelstelling3: functioneringReviews.doelstelling3,
        doelstelling3Termijn: functioneringReviews.doelstelling3Termijn,
        afspraken: functioneringReviews.afspraken,
        opmerkingMedewerker: functioneringReviews.opmerkingMedewerker,
        opmerkingLeidinggevende: functioneringReviews.opmerkingLeidinggevende,
        createdBy: functioneringReviews.createdBy,
        createdAt: functioneringReviews.createdAt,
        updatedAt: functioneringReviews.updatedAt,
        userName: users.fullName,
      })
      .from(functioneringReviews)
      .leftJoin(users, eq(functioneringReviews.userId, users.id))
      .orderBy(desc(functioneringReviews.year), desc(functioneringReviews.createdAt));
    return result as any;
  }

  async getFunctioneringReviewsByUser(userId: string): Promise<FunctioneringReview[]> {
    return db.select().from(functioneringReviews)
      .where(eq(functioneringReviews.userId, userId))
      .orderBy(desc(functioneringReviews.year));
  }

  async getFunctioneringReviewsByYear(year: number): Promise<(FunctioneringReview & { userName?: string })[]> {
    const result = await db
      .select({
        id: functioneringReviews.id,
        userId: functioneringReviews.userId,
        year: functioneringReviews.year,
        medewerker: functioneringReviews.medewerker,
        functie: functioneringReviews.functie,
        afdeling: functioneringReviews.afdeling,
        leidinggevende: functioneringReviews.leidinggevende,
        datum: functioneringReviews.datum,
        periode: functioneringReviews.periode,
        terugblikTaken: functioneringReviews.terugblikTaken,
        terugblikResultaten: functioneringReviews.terugblikResultaten,
        terugblikKnelpunten: functioneringReviews.terugblikKnelpunten,
        werkinhoud: functioneringReviews.werkinhoud,
        samenwerking: functioneringReviews.samenwerking,
        communicatie: functioneringReviews.communicatie,
        leidinggeven: functioneringReviews.leidinggeven,
        arbeidsomstandigheden: functioneringReviews.arbeidsomstandigheden,
        persoonlijkeOntwikkeling: functioneringReviews.persoonlijkeOntwikkeling,
        scholingswensen: functioneringReviews.scholingswensen,
        loopbaanwensen: functioneringReviews.loopbaanwensen,
        doelstelling1: functioneringReviews.doelstelling1,
        doelstelling1Termijn: functioneringReviews.doelstelling1Termijn,
        doelstelling2: functioneringReviews.doelstelling2,
        doelstelling2Termijn: functioneringReviews.doelstelling2Termijn,
        doelstelling3: functioneringReviews.doelstelling3,
        doelstelling3Termijn: functioneringReviews.doelstelling3Termijn,
        afspraken: functioneringReviews.afspraken,
        opmerkingMedewerker: functioneringReviews.opmerkingMedewerker,
        opmerkingLeidinggevende: functioneringReviews.opmerkingLeidinggevende,
        createdBy: functioneringReviews.createdBy,
        createdAt: functioneringReviews.createdAt,
        updatedAt: functioneringReviews.updatedAt,
        userName: users.fullName,
      })
      .from(functioneringReviews)
      .leftJoin(users, eq(functioneringReviews.userId, users.id))
      .where(eq(functioneringReviews.year, year))
      .orderBy(functioneringReviews.medewerker);
    return result as any;
  }

  async getFunctioneringReviewByUserAndYear(userId: string, year: number): Promise<FunctioneringReview | undefined> {
    const [review] = await db.select().from(functioneringReviews)
      .where(and(eq(functioneringReviews.userId, userId), eq(functioneringReviews.year, year)));
    return review;
  }

  async createFunctioneringReview(review: InsertFunctioneringReview): Promise<FunctioneringReview> {
    const [created] = await db.insert(functioneringReviews).values(review).returning();
    return created;
  }

  async updateFunctioneringReview(id: string, data: Partial<InsertFunctioneringReview>): Promise<FunctioneringReview> {
    const [updated] = await db.update(functioneringReviews)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(functioneringReviews.id, id))
      .returning();
    return updated;
  }

  async deleteFunctioneringReview(id: string): Promise<void> {
    await db.delete(functioneringReviews).where(eq(functioneringReviews.id, id));
  }

  async getCompetenciesByFunctie(functie: string): Promise<Competency[]> {
    return db.select().from(competencies)
      .where(eq(competencies.functie, functie))
      .orderBy(competencies.sortOrder);
  }

  async getAllCompetencies(): Promise<Competency[]> {
    return db.select().from(competencies).orderBy(competencies.functie, competencies.sortOrder);
  }

  async createCompetency(comp: InsertCompetency): Promise<Competency> {
    const [created] = await db.insert(competencies).values(comp).returning();
    return created;
  }

  async updateCompetency(id: string, data: Partial<InsertCompetency>): Promise<Competency> {
    const [updated] = await db.update(competencies).set(data).where(eq(competencies.id, id)).returning();
    return updated;
  }

  async deleteCompetency(id: string): Promise<void> {
    await db.delete(beoordelingScores).where(eq(beoordelingScores.competencyId, id));
    await db.delete(competencies).where(eq(competencies.id, id));
  }

  async getBeoordelingReviews(): Promise<(BeoordelingReview & { userName?: string })[]> {
    const result = await db
      .select({
        id: beoordelingReviews.id,
        userId: beoordelingReviews.userId,
        year: beoordelingReviews.year,
        medewerker: beoordelingReviews.medewerker,
        functie: beoordelingReviews.functie,
        afdeling: beoordelingReviews.afdeling,
        beoordelaar: beoordelingReviews.beoordelaar,
        datum: beoordelingReviews.datum,
        periode: beoordelingReviews.periode,
        totalScore: beoordelingReviews.totalScore,
        afspraken: beoordelingReviews.afspraken,
        opmerkingMedewerker: beoordelingReviews.opmerkingMedewerker,
        opmerkingBeoordelaar: beoordelingReviews.opmerkingBeoordelaar,
        createdBy: beoordelingReviews.createdBy,
        createdAt: beoordelingReviews.createdAt,
        updatedAt: beoordelingReviews.updatedAt,
        userName: users.fullName,
      })
      .from(beoordelingReviews)
      .leftJoin(users, eq(beoordelingReviews.userId, users.id))
      .orderBy(desc(beoordelingReviews.year), desc(beoordelingReviews.createdAt));
    return result as any;
  }

  async getBeoordelingReviewsByUser(userId: string): Promise<BeoordelingReview[]> {
    return db.select().from(beoordelingReviews)
      .where(eq(beoordelingReviews.userId, userId))
      .orderBy(desc(beoordelingReviews.year));
  }

  async getBeoordelingReviewsByYear(year: number): Promise<(BeoordelingReview & { userName?: string })[]> {
    const result = await db
      .select({
        id: beoordelingReviews.id,
        userId: beoordelingReviews.userId,
        year: beoordelingReviews.year,
        medewerker: beoordelingReviews.medewerker,
        functie: beoordelingReviews.functie,
        afdeling: beoordelingReviews.afdeling,
        beoordelaar: beoordelingReviews.beoordelaar,
        datum: beoordelingReviews.datum,
        periode: beoordelingReviews.periode,
        totalScore: beoordelingReviews.totalScore,
        afspraken: beoordelingReviews.afspraken,
        opmerkingMedewerker: beoordelingReviews.opmerkingMedewerker,
        opmerkingBeoordelaar: beoordelingReviews.opmerkingBeoordelaar,
        createdBy: beoordelingReviews.createdBy,
        createdAt: beoordelingReviews.createdAt,
        updatedAt: beoordelingReviews.updatedAt,
        userName: users.fullName,
      })
      .from(beoordelingReviews)
      .leftJoin(users, eq(beoordelingReviews.userId, users.id))
      .where(eq(beoordelingReviews.year, year))
      .orderBy(beoordelingReviews.medewerker);
    return result as any;
  }

  async getBeoordelingReviewByUserAndYear(userId: string, year: number): Promise<BeoordelingReview | undefined> {
    const [review] = await db.select().from(beoordelingReviews)
      .where(and(eq(beoordelingReviews.userId, userId), eq(beoordelingReviews.year, year)));
    return review;
  }

  async createBeoordelingReview(review: InsertBeoordelingReview): Promise<BeoordelingReview> {
    const [created] = await db.insert(beoordelingReviews).values(review).returning();
    return created;
  }

  async updateBeoordelingReview(id: string, data: Partial<InsertBeoordelingReview>): Promise<BeoordelingReview> {
    const [updated] = await db.update(beoordelingReviews)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(beoordelingReviews.id, id))
      .returning();
    return updated;
  }

  async deleteBeoordelingReview(id: string): Promise<void> {
    await db.delete(beoordelingScores).where(eq(beoordelingScores.reviewId, id));
    await db.delete(beoordelingReviews).where(eq(beoordelingReviews.id, id));
  }

  async getBeoordelingScoresByReview(reviewId: string): Promise<(BeoordelingScore & { competencyName?: string })[]> {
    const result = await db
      .select({
        id: beoordelingScores.id,
        reviewId: beoordelingScores.reviewId,
        competencyId: beoordelingScores.competencyId,
        score: beoordelingScores.score,
        toelichting: beoordelingScores.toelichting,
        competencyName: competencies.name,
      })
      .from(beoordelingScores)
      .leftJoin(competencies, eq(beoordelingScores.competencyId, competencies.id))
      .where(eq(beoordelingScores.reviewId, reviewId));
    return result as any;
  }

  async createBeoordelingScore(score: InsertBeoordelingScore): Promise<BeoordelingScore> {
    const [created] = await db.insert(beoordelingScores).values(score).returning();
    return created;
  }

  async updateBeoordelingScore(id: string, data: Partial<InsertBeoordelingScore>): Promise<BeoordelingScore> {
    const [updated] = await db.update(beoordelingScores).set(data).where(eq(beoordelingScores.id, id)).returning();
    return updated;
  }

  async deleteBeoordelingScoresByReview(reviewId: string): Promise<void> {
    await db.delete(beoordelingScores).where(eq(beoordelingScores.reviewId, reviewId));
  }

  async getJaarplanItemsByYear(year: number): Promise<(JaarplanItem & { userName?: string })[]> {
    const items = await db.select().from(jaarplanItems).where(eq(jaarplanItems.year, year));
    const allUsers = await db.select().from(users);
    return items.map(item => ({
      ...item,
      userName: allUsers.find(u => u.id === item.userId)?.fullName || "Onbekend",
    }));
  }

  async getJaarplanItemsByUser(userId: string): Promise<(JaarplanItem & { userName?: string })[]> {
    const items = await db.select().from(jaarplanItems).where(eq(jaarplanItems.userId, userId));
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    return items.map(item => ({ ...item, userName: user?.fullName || "Onbekend" }));
  }

  async createJaarplanItem(item: InsertJaarplanItem): Promise<JaarplanItem> {
    const [created] = await db.insert(jaarplanItems).values(item).returning();
    return created;
  }

  async updateJaarplanItem(id: string, data: Partial<InsertJaarplanItem>): Promise<JaarplanItem> {
    const [updated] = await db.update(jaarplanItems).set({ ...data, updatedAt: new Date() }).where(eq(jaarplanItems.id, id)).returning();
    return updated;
  }

  async deleteJaarplanItem(id: string): Promise<void> {
    await db.delete(jaarplanItems).where(eq(jaarplanItems.id, id));
  }

  async getAllHelpContent(): Promise<HelpContent[]> {
    return db.select().from(helpContentTable);
  }

  async upsertHelpContent(data: InsertHelpContent): Promise<HelpContent> {
    const [existing] = await db.select().from(helpContentTable).where(eq(helpContentTable.pageRoute, data.pageRoute));
    if (existing) {
      const [updated] = await db.update(helpContentTable).set({ title: data.title, content: data.content }).where(eq(helpContentTable.id, existing.id)).returning();
      return updated;
    }
    const [created] = await db.insert(helpContentTable).values(data).returning();
    return created;
  }

  async getOfficialHolidays(year?: number): Promise<OfficialHoliday[]> {
    if (year) {
      return db.select().from(officialHolidays).where(eq(officialHolidays.year, year)).orderBy(officialHolidays.date);
    }
    return db.select().from(officialHolidays).orderBy(officialHolidays.date);
  }

  async createOfficialHoliday(holiday: InsertOfficialHoliday): Promise<OfficialHoliday> {
    const [created] = await db.insert(officialHolidays).values(holiday).returning();
    return created;
  }

  async deleteOfficialHoliday(id: string): Promise<void> {
    await db.delete(officialHolidays).where(eq(officialHolidays.id, id));
  }

  async deleteOfficialHolidaysByYear(year: number): Promise<void> {
    await db.delete(officialHolidays).where(eq(officialHolidays.year, year));
  }

  async getSnipperdagen(year?: number): Promise<Snipperdag[]> {
    if (year) {
      return db.select().from(snipperdagen).where(eq(snipperdagen.year, year)).orderBy(snipperdagen.date);
    }
    return db.select().from(snipperdagen).orderBy(snipperdagen.date);
  }

  async createSnipperdag(snipperdag: InsertSnipperdag): Promise<Snipperdag> {
    const [created] = await db.insert(snipperdagen).values(snipperdag).returning();
    return created;
  }

  async deleteSnipperdag(id: string): Promise<void> {
    await db.delete(snipperdagen).where(eq(snipperdagen.id, id));
  }
}

export const storage = new DatabaseStorage();
