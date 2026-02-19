# Kantoor Dashboard

## Overview
A comprehensive office dashboard application with 9 modules and granular permissions for managing office operations. Built with React/Express/PostgreSQL.

## Architecture
- **Frontend**: React with TypeScript, Tailwind CSS, shadcn/ui components
- **Backend**: Express.js with TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Auth**: Session-based authentication with bcrypt password hashing
- **Permissions**: Module-level access control via `permissions` text[] column on users

## Modules
1. **Dashboard** - Overview with stats, upcoming events, recent announcements, pending absences
2. **Evenementen Kalender** - Event management with categories (vergadering, training, sociaal, deadline)
3. **Aankondigingen** - Announcements with priority levels, pinning, PDF attachments, and direct messaging (admin/manager to employee with reply)
4. **Organisatie** - Department management with tabs: Afdelingen (department cards with manager info), AO-Procedures (admin-managed procedures with step-by-step instructions per department), Organogram (visual org chart), CAO Info (collective labor agreement overview), Wetgeving (legislation links grouped by category)
5. **Personalia** - Employee directory with roles and departments
6. **Verzuim** - Absence/leave management with approval workflow
7. **Beloningsysteem** - Points-based rewards with leaderboard
8. **Applicaties** - Application access management with user permissions
9. **Beheer** - Admin-only user permissions management (toggle module access per user)
10. **Mijn Profiel** - Personal profile page with own absences, rewards, and access overview

## Authentication & Permissions
- Session-based with PostgreSQL session store
- Demo credentials: admin/admin123, manager/user123, pieter/user123, sophie/user123, thomas/user123
- Roles: admin, manager, employee (different permissions per role)
- Module permissions stored as text[] on each user
- Default permissions: admin=all 9 modules, manager=8 (no beheer), employee=5 (dashboard, kalender, aankondigingen, verzuim, beloningen)
- Sidebar navigation filtered by user.permissions
- Routes conditionally rendered based on permissions (unauthorized URLs show 404)

## Key Files
- `shared/schema.ts` - All data models and Zod schemas
- `server/routes.ts` - All API endpoints
- `server/storage.ts` - Database operations
- `server/seed.ts` - Sample data seeding
- `server/db.ts` - Database connection
- `client/src/App.tsx` - Main app with routing and layout
- `client/src/lib/auth.tsx` - Authentication context
- `client/src/pages/` - All page components

## API Routes
All routes prefixed with `/api/` and require authentication except login.
- POST /api/auth/login, GET /api/auth/me, POST /api/auth/logout
- GET/POST/DELETE /api/events, /api/announcements, /api/departments, /api/users
- GET/POST /api/absences, PATCH /api/absences/:id (approve/reject)
- GET /api/absences/mine - Current user's absences only
- GET/POST /api/rewards, GET /api/rewards/leaderboard
- GET /api/rewards/mine - Current user's rewards only
- GET/POST/DELETE /api/applications, /api/app-access
- GET /api/dashboard/stats
- PATCH /api/users/:id/permissions - Admin only, update user module permissions
- GET /api/messages - Current user's messages (sent + received)
- POST /api/messages - Send message (admin/manager only): { toUserId, subject, content }
- PATCH /api/messages/:id/reply - Reply to message (recipient only): { reply }
- PATCH /api/messages/:id/read - Mark message as read (recipient only)
- GET /api/ao-procedures - All AO procedures with department names
- POST /api/ao-procedures - Create procedure (admin only): { departmentId, title, description? }
- DELETE /api/ao-procedures/:id - Delete procedure and its instructions (admin only)
- GET /api/ao-instructions/:procedureId - Instructions for a procedure
- POST /api/ao-instructions - Create instruction (admin only): { procedureId, title, content, sortOrder }
- DELETE /api/ao-instructions/:id - Delete instruction (admin only)
- GET /api/legislation - All legislation links
- POST /api/legislation - Create legislation link (admin only): { title, url, description?, category }
- DELETE /api/legislation/:id - Delete legislation link (admin only)

## Running Locally
```bash
npm install
npm run db:push
npm run dev
```
