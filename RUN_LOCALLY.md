# Kantoor Dashboard - Lokaal Draaien

## Vereiste Software

1. **Node.js** (versie 20 of nieuwer)
   - Download van [nodejs.org](https://nodejs.org)
   - Dit installeert ook npm (de pakketbeheerder)

2. **PostgreSQL** (versie 14 of nieuwer)
   - Download van [postgresql.org](https://www.postgresql.org/download/)
   - Maak na installatie een database aan (bijv. `kantoor_dashboard`)

## Omgevingsvariabelen

Maak een `.env` bestand aan in de hoofdmap van het project, of stel deze variabelen in via je terminal:

| Variabele | Doel | Voorbeeld |
|---|---|---|
| `DATABASE_URL` | Verbindingsstring voor je PostgreSQL database | `postgresql://gebruiker:wachtwoord@localhost:5432/kantoor_dashboard` |
| `SESSION_SECRET` | Willekeurige tekst om sessies te beveiligen | `mijn-geheime-sleutel-12345` |

## Installatie & Opstarten

1. Kopieer alle projectbestanden naar een map op je computer
2. Open een terminal in die map
3. Voer uit: `npm install` — downloadt alle benodigde bibliotheken
4. Voer uit: `npm run db:push` — maakt de databasetabellen aan
5. Voer uit: `npm run dev` — start de applicatie in ontwikkelmodus

De applicatie is dan beschikbaar op **http://localhost:5000**

## Productie

1. Voer uit: `npm run build` — maakt een geoptimaliseerde versie
2. Voer uit: `npm start` — draait de productieversie

## Overzicht Commando's

| Commando | Wat het doet |
|---|---|
| `npm install` | Downloadt alle benodigde bibliotheken |
| `npm run db:push` | Maakt/actualiseert de databasetabellen |
| `npm run dev` | Start de app in ontwikkelmodus (herlaadt automatisch bij wijzigingen) |
| `npm run build` | Maakt een productieversie |
| `npm start` | Draait de productieversie |

## Standaard Inloggegevens

De app vult de database automatisch met voorbeelddata bij de eerste start. Je kunt inloggen met:

| Gebruikersnaam | Wachtwoord | Rol |
|---|---|---|
| admin | admin123 | Beheerder (volledige toegang) |
| manager | user123 | Manager |
| pieter | user123 | Medewerker |
| sophie | user123 | Medewerker |
| thomas | user123 | Medewerker |

## Opmerking

Het bestand `vite.config.ts` bevat enkele Replit-specifieke plugins (dev banner, cartographer). Deze worden alleen geladen op het Replit-platform en worden lokaal automatisch overgeslagen — ze veroorzaken geen problemen.
