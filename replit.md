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
2. **Evenementen Kalender** - Event management with categories (vergadering, training, sociaal, deadline), official holiday upload (CSV or manual entry, per year, admin-only), sidebar notification badge for new current-month events/snipperdagen
3. **Aankondigingen** - Announcements with priority levels, pinning, PDF attachments, and direct messaging (admin/manager to employee with reply)
4. **Organisatie** - Department management with tabs: Afdelingen (department cards with manager info), AO-Procedures (admin-managed procedures with step-by-step instructions per department), Organogram (visual org chart), CAO Info (collective labor agreement overview), Wetgeving (legislation links grouped by category)
5. **Personalia** - Employee directory with roles and departments
6. **Verzuim** - Absence/leave management with approval workflow, BVVD (bijzonder verlof) with predefined reasons, vacation day balance tracking per employee with Recht (entitlement per Jan 1), Saldo Oud (previous year balance), Totaal (recht + saldo oud), and Saldo Nieuw (remaining after deductions), admin "Vakantierecht Instellen" dialog to set Recht and Saldo Oud per employee, snipperdagen (mandatory days off deducted from all employees' vacation balance)
7. **Beloningen** - Four sub-tabs: Functioneringsgesprekken (performance reviews with database storage and year-based filtering), Beoordelingsgesprekken (competency-based assessments where admin configures 5-6 competencies per functie with optional normering descriptions per score level 1-5, each scored 1-5 with auto-calculated total and average, functie dropdown populated from configured functies, competency dropdown with collapsible normering), Jaarplan (yearly planning per employee with afspraken/start/einde/voortgang/status tracking, grouped by employee with color-coded status badges), and Beloning (yearly awards: "Afdeling van het Jaar" and "Manager van het Jaar" displayed in two columns per year with year navigation)
8. **Applicaties** - Application access management with user permissions
9. **Rapporten** - Printable reports with 4 tabs: Medewerker info (Kadaster ID, Naam, Cedulanr., Telefoonnr., Mobielnr., Adres), Verjaardagen (birthdays sorted by month/day), Jubilea (years of service with milestone highlights), Medewerker status (all employees active/inactive)
10. **Beheer** - Admin-only user permissions management (toggle module access per user)
11. **Mijn Profiel** - Personal profile page with own absences, rewards, and access overview

## Security
- Helmet middleware for HTTP security headers
- Rate limiting: 10 requests/15 min on auth endpoints, 100 requests/min on general API
- Session cookies: httpOnly, sameSite=lax, secure in production
- Session secret: from SESSION_SECRET env var (random fallback in dev with warning)
- Password policy: minimum 8 characters, bcrypt with 12 rounds
- Self-service password reset removed; users can look up their username via email, but must contact admin for password reset
- No email enumeration: reset endpoint returns generic message regardless of email existence

## Authentication & Permissions
- Session-based with PostgreSQL session store
- Demo credentials: admin/admin123, manager/user123, pieter/user123, sophie/user123, thomas/user123
- Roles: directeur, admin, manager, manager_az, employee (different permissions per role)
- `isAdminRole()` helper from `@shared/schema` checks for both "directeur" and "admin" roles
- `canManageVacation()` helper checks for "directeur", "admin", and "manager_az" roles
- Directeur role has all admin privileges plus exclusive ability to approve manager/admin absence requests
- Admins can approve employee absences only; managers approve employees in their department only
- Manager AZ (Algemene Zaken) has manager-level access plus vacation management: Snipperdagen, Vakantierecht Instellen, and Saldo Oud editing; can also fully edit Personalia (create, edit, deactivate users)
- Module permissions stored as text[] on each user
- Default permissions: directeur/admin=all 9 modules, manager=8 (no beheer), employee=5 (dashboard, kalender, aankondigingen, verzuim, beloningen)
- Sidebar navigation filtered by user.permissions
- Routes conditionally rendered based on permissions (unauthorized URLs show 404)

## Page Hero Banners
- `client/src/components/page-hero.tsx` - Reusable PageHero component (title, subtitle, background image)
- Hero images stored at `uploads/App_pics/` (served statically, unauthenticated)
- All 9 module pages + profiel use PageHero: dashboard, login, kalender, aankondigingen, organisatie, personalia, verzuim, beloningen, applicaties, beheer, profiel
- Page structure: outer `div.overflow-auto.h-full` → `<PageHero />` → inner `div.p-6.space-y-*` (content)

## Key Files
- `shared/schema.ts` - All data models and Zod schemas
- `server/routes.ts` - All API endpoints
- `server/storage.ts` - Database operations
- `server/seed.ts` - Sample data seeding
- `server/db.ts` - Database connection
- `client/src/App.tsx` - Main app with routing and layout
- `client/src/lib/auth.tsx` - Authentication context
- `client/src/pages/` - All page components
- `client/src/components/page-hero.tsx` - Page hero banner component

## API Routes
All routes prefixed with `/api/` and require authentication except login.
- POST /api/auth/login, GET /api/auth/me, POST /api/auth/logout
- GET/POST/DELETE /api/events, /api/announcements, /api/departments, /api/users
- GET/POST /api/absences, PATCH /api/absences/:id (approve/reject)
- GET /api/absences/mine - Current user's absences only
- GET/POST /api/rewards, GET /api/rewards/leaderboard
- GET /api/rewards/mine - Current user's rewards only
- GET /api/functionering?year=YYYY - Functionering reviews, optionally filtered by year
- GET /api/functionering/mine - Current user's reviews
- GET /api/functionering/:userId/:year - Specific review by user and year
- POST /api/functionering - Create or update review (upsert by userId+year)
- PUT /api/functionering/:id - Update specific review
- DELETE /api/functionering/:id - Delete review
- GET /api/competencies - All competencies
- GET /api/competencies/functie/:functie - Competencies for a function
- POST /api/competencies - Create competency (admin/manager): { functie, name, sortOrder }
- PUT /api/competencies/:id - Update competency (admin/manager)
- DELETE /api/competencies/:id - Delete competency and associated scores (admin/manager)
- GET /api/beoordeling?year=YYYY - Beoordeling reviews, optionally filtered by year
- GET /api/beoordeling/mine - Current user's beoordeling reviews
- GET /api/beoordeling/:id/scores - Scores for a beoordeling review
- POST /api/beoordeling - Create/update beoordeling review with scores (upsert by userId+year)
- DELETE /api/beoordeling/:id - Delete beoordeling review (admin/manager)
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
- GET /api/position-history/mine - Current user's position history
- GET /api/position-history/user/:userId - Position history for a user (own data or admin)
- GET /api/position-history - All position history (admin only)
- POST /api/position-history - Create position entry (admin only): { userId, functionTitle, startDate, endDate?, salary?, notes? }
- PATCH /api/position-history/:id - Update position entry (admin only)
- DELETE /api/position-history/:id - Delete position entry (admin only)
- GET /api/vacation-balance - Vacation day balance for all active employees
- PATCH /api/users/:id/vacation-days - Admin only, set vacation day entitlement (Recht): { vacationDaysTotal }
- PATCH /api/users/:id/saldo-oud - Admin only, set previous year balance (Saldo Oud): { vacationDaysSaldoOud }
- GET /api/legislation - All legislation links
- POST /api/legislation - Create legislation link (admin only): { title, url, description?, category }
- DELETE /api/legislation/:id - Delete legislation link (admin only)
- GET /api/snipperdagen?year=YYYY - Snipperdagen (mandatory days off), optionally filtered by year
- POST /api/snipperdagen - Create snipperdag (admin only): { name, date } — duplicate dates rejected
- DELETE /api/snipperdagen/:id - Delete snipperdag (admin only)
- GET /api/official-holidays?year=YYYY - Official holidays, optionally filtered by year
- POST /api/official-holidays - Upload holidays for a year (admin only): { year, holidays: [{name, date}] } — replaces all for that year
- DELETE /api/official-holidays/:id - Delete single holiday (admin only)
- GET /api/yearly-awards?year=YYYY - Yearly awards (Afdeling/Manager van het Jaar), optionally filtered by year
- POST /api/yearly-awards - Create yearly award (admin only): { year, type: "department"|"manager", name }
- DELETE /api/yearly-awards/:id - Delete yearly award (admin only)
- GET /api/trend-km-info - Trend balie KM info data (all rows)
- POST /api/trend-km-info/import - Import CSV for trend KM info (admin/manager)
- GET /api/trend-or-info - Trend balie OR info data (all rows)
- POST /api/trend-or-info/import - Import CSV for trend OR info (admin/manager)
- GET /api/trend-or-algemeen - Trend OR algemeen data (all rows)
- POST /api/trend-or-algemeen/import - Import CSV for trend OR algemeen (admin/manager)
- GET /api/trend-or-notaris - Trend OR notaris data (all rows, includes notaris_key + waarde per year/month)
- POST /api/trend-or-notaris/import - Import CSV for trend OR notaris (admin/manager)
- GET /api/trend-kartografen-hist - Trend kartografen historisch data (all rows)
- POST /api/trend-kartografen-hist/import - Import CSV for trend kartografen (admin/manager)
- GET /api/trend-km-buiten - Trend KM buiten (landmeters) data (all rows)
- POST /api/trend-km-buiten/import - Import CSV for trend KM buiten (admin/manager)

## Productiestatistieken Module
- All 6 trend tabs (BalieMedewerkerTab, BalieM3Tab, TrendOrAlgemeenTab, TrendOrNotarisTab, TrendKartografenTab, LandmetersTab) fetch live data from DB via useQuery
- Each tab falls back to hardcoded data if DB is empty
- Each tab has a TrendImportButton component for CSV import (admin/manager roles only)
- DB tables seeded with historical data: trend_km_info (216 rows), trend_or_info (216 rows), trend_or_algemeen (300 rows), trend_or_notaris (5400 rows), trend_kartografen_hist (120 rows), trend_km_buiten (372 rows)

## Maandelijkse Productie Module (tab "Maandelijkse productie")
- **Productie Kartografen** (tab-prod-kartografen): per kartograaf mbr/kad_spl/gr_uitz/ex_pl/plot_coor/losse_mbr invoer
  - DB: maand_prod_kartograaf + maand_prod_samenvatting
  - Write-through: synct naar trend_kartografen_hist + kartografie_productie
  - Prod = mbr + kad_spl + gr_uitz (exclusief ex_pl/plot_coor/losse_mbr)
- **Productie Landmeters** (tab-prod-landmeters): per landmeter ex_uitb/meting/gr_uitz/l_meting/plot_inzage_coord invoer
  - DB: maand_prod_landmeter + maand_prod_samenvatting_lm
  - Write-through: synct naar trend_km_buiten
  - Totaal = meting + gr_uitz (ex_uitb/l_meting/plot_inzage_coord niet in totaal)
  - Standaard landmeters: H. Balootje, R. Conradus, L. Francisca, E. Felicia, A. Zimmerman, J. Baromeo, M. Isidora
  - "Afgeboekte stukken" rij is speciaal (geen invoervelden, niet meegeteld)
- GET /api/trend-kartografen-hist en GET /api/kartografie-productie mergen automatisch maand_prod data voor ontbrekende maanden
- GET /api/trend-km-buiten mergt automatisch maand_prod_landmeter data voor ontbrekende maanden

## Running Locally
```bash
npm install
npm run db:push
npm run dev
```
