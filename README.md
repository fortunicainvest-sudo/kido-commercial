# KIDO — version commerciale

Plateforme de salles live (concerts, cinéma, conférences, matchs, réunions,
événements privés) avec billetterie réelle (Kido Pass), diffusion en direct,
et fil vidéo natif — pour un public à la fois ivoirien/ouest-africain et
international.

Deux applications :

```
backend/    API Node.js + TypeScript + Express + PostgreSQL + Socket.io
frontend/   App web React + Vite + TypeScript + Tailwind
```

---

## 1. Installer en local

Prérequis : Node.js 20+, PostgreSQL (local ou distant).

```bash
# Backend
cd backend
cp .env.example .env        # puis remplis les variables (voir section 2)
npm install
npm run migrate             # crée les tables
npm run dev                 # https://kido-backend.onrender.com
# Frontend (dans un autre terminal)
cd frontend
cp .env.example .env 2>/dev/null || echo "VITE_API_URL=https://kido-backend.onrender.com > .env
npm install
npm run dev                 # http://localhost:5173
```

Sans aucune clé tierce configurée, l'appli tourne quand même : inscription,
connexion, création d'événements, billets **gratuits**, explorateur et fil
vidéo fonctionnent tous avec juste Postgres. Stripe/CinetPay/LiveKit/R2 ne
sont nécessaires que pour les billets payants, le direct et l'upload vidéo.

---

## 2. Variables d'environnement à remplir (`backend/.env`)

| Variable | À quoi ça sert | Où l'obtenir |
|---|---|---|
| `DATABASE_URL` | Base Postgres | [Neon](https://neon.tech) (gratuit pour démarrer) — copie la "connection string" |
| `JWT_SECRET` | Signe les sessions utilisateur | N'importe quelle longue chaîne aléatoire, ex. `openssl rand -hex 32` |
| `KIDO_PASS_SECRET` | Signe les Kido Pass (billets) | Idem — **différente** de `JWT_SECRET` |
| `CORS_ORIGIN` | Autorise le frontend à appeler l'API | L'URL de ton frontend déployé |
| `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` | Paiement carte (international) | [dashboard.stripe.com](https://dashboard.stripe.com) → Developers → API keys / Webhooks |
| `CINETPAY_API_KEY` / `CINETPAY_SITE_ID` | Paiement Mobile Money (CI/UEMOA) | [cinetpay.com](https://cinetpay.com) → ton compte marchand |
| `LIVEKIT_API_KEY` / `LIVEKIT_API_SECRET` / `LIVEKIT_URL` | Audio/vidéo en direct | [cloud.livekit.io](https://cloud.livekit.io) → crée un projet |
| `R2_ACCOUNT_ID` / `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` / `R2_BUCKET` / `R2_PUBLIC_URL` | Stockage vidéo/images | Dashboard Cloudflare → R2 → crée un bucket + une clé API |
| `PUBLIC_API_URL` | URL publique de l'API (webhook CinetPay) | L'URL de ton backend déployé |

Le frontend n'a qu'une seule variable : `VITE_API_URL` (l'URL de l'API,
avec `/api` à la fin).

---

## 3. Déployer

**Backend → Fly.io** (`backend/Dockerfile` et `backend/fly.toml` déjà prêts) :
```bash
cd backend
fly launch --no-deploy   # une fois, pour lier l'app à ton compte
fly secrets set DATABASE_URL=... JWT_SECRET=... KIDO_PASS_SECRET=... # etc.
fly deploy
```
Le déploiement fait tourner `db/migrate.js` automatiquement avant de démarrer
le serveur — pas de migration manuelle à faire.

**Frontend → n'importe quel hébergeur statique** (Vercel, Netlify, Firebase
Hosting, Cloudflare Pages) : `npm run build` produit `frontend/dist/`, à
servir tel quel. Pense à définir `VITE_API_URL` au moment du build.

---

## 4. Ce qui a été testé ici, et ce qui ne l'a pas été

Ce projet a été construit dans un environnement sans accès réseau vers les
services tiers (Stripe, CinetPay, LiveKit Cloud, Cloudflare R2, Neon) — donc
tout ce qui touche à ces services a été écrit avec soin mais **jamais
exécuté en conditions réelles**. Concrètement :

- **Testé réellement**, avec de vraies requêtes contre une vraie base
  Postgres locale : auth, création d'événements, billetterie (y compris
  paliers VIP/SPEAKER/STAFF, anti-survente, remboursement automatique de
  place si le paiement échoue), Kido Pass (signature + anti-rejeu),
  abonnements (upgrade de plan, idempotence), scanner, dashboard, upload
  vidéo (la génération de lien signé R2 ne demande pas de réseau — c'est du
  calcul cryptographique local), filtre anti-insultes du chat public
  (connexion Socket.io réelle).
- **Jamais testé en conditions réelles** : un vrai paiement Stripe ou
  CinetPay de bout en bout, une vraie salle LiveKit avec plusieurs
  participants, un vrai enregistrement Egress, un vrai upload de fichier
  vers R2, le rendu visuel du frontend dans un navigateur.
- Le filtre anti-insultes ne s'applique qu'au **chat public** d'une salle,
  volontairement — voir le commentaire dans
  `backend/src/modules/realtime/socket.ts`. Aucun chat privé n'existe
  encore dans l'app ; si tu en ajoutes un, ne branche pas ce filtre dessus.

La première chose à faire une fois les vraies clés en main : ouvrir
l'app dans un navigateur et suivre le parcours complet une fois à la main
(inscription → création d'événement payant → paiement réel → entrée en
salle live → scan du billet) pour rattraper ce qu'un test automatisé sans
réseau ne peut pas voir.
