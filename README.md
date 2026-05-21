# Technická Dokumentácia — Záverečné Zadanie WEBTE2

**Predmet:** WEBTE2  
**Akademický rok:** 2025/2026  
**Tím:** Viliam Páleník, Ignác Balla 
**Nasadená aplikácia:** https://node75.webte.fei.stuba.sk

---

## 1. Popis aplikácie

Webová aplikácia používa matematický softvér **Octave** cez REST API. obsahuje tieto funkcie:

- **Webová konzola** — interaktívne prostredie pre zadávanie Octave príkazov. Premenné 
uchováva v pamäti a používateľ môže s nimi robiť výpočty.
- **Fyzikálne simulácie** — inverzné kyvadlo a gulička na tyči, 2D plocha s animáciou synchronizovanou s grafom.
- **Štatistiky** — sledovanie využitia animácií s určením štátu a mesta z IP adresy.
- **API dokumentácia** — OpenAPI 3.0 s exportom do PDF

---

## 2. Architektúra

```
Prehliadač
    │
    ▼
nginx (server, port 443)
    │  proxy_pass localhost:8080
    ▼
nginx:alpine (Docker, port 8080)  ← obsluhuje statický frontend + /api proxy
    ├── /           → frontend/dist/  (React — statické súbory)
    └── /api/*      → PHP-FPM (port 9000) → Laravel 13 → MariaDB 11
```

### Vývojové prostredie (lokálne)

```
Prehliadač → Vite server (:5173) → proxy /api → nginx:alpine (:8080) → PHP-FPM → MariaDB
```

---

## 3. Použité technológie

### Backend

| Technológia | Verzia | Účel |
|---|---|---|
| PHP | 8.3-FPM (Debian) | Runtime pre Laravel |
| Laravel | 13.8 | REST API framework |
| Octave | systémový balík | Matematické výpočty |
| octave-control | systémový balík | LQR, place(), ss(), lsim() |
| MariaDB | 11 | Databáza |
| nginx | alpine | Webový server / reverse proxy |
| dompdf/dompdf | ^2.0 | Generovanie PDF dokumentácie |
| laravel/sanctum | ^4.0 | Autentifikácia (závislosť) |

### Frontend

| Technológia | Verzia | Účel |
|---|---|---|
| React | 19.2.6 | UI framework |
| Vite | 8.0.12 | Build nástroj |
| React Router | 7.15.1 | routing |
| Axios | 1.16.1 | HTTP požiadavky |
| PrismJS | 1.30.0 | Zvýrazňovanie syntaxe (Octave) |
| react-simple-code-editor | 0.14.1 | Editor s farebným zvýrazňovaním |
| Node.js | 20-alpine | Runtime pre build |

### Docker

| Nástroj | Verzia | Poznámka |
|---|---|---|
| Docker | 29.x (apt docker.io) | Kontajnerizácia |
| Docker Compose | v2.27.1 | Na správu kontajnerov |

---

## 4. Databázová schéma

### Tabuľka `cas_logs`

| Stĺpec | Typ | Popis |
|---|---|---|
| id | BIGINT PK | Auto-increment |
| session_id | VARCHAR | ID relácie prehliadača |
| command | TEXT | Zadaný Octave príkaz |
| output | TEXT NULL | Výstup príkazu |
| is_success | BOOLEAN | Úspešnosť vykonania |
| created_at / updated_at | TIMESTAMP | Časové pečiatky |

### Tabuľka `animation_logs`

| Stĺpec | Typ | Popis |
|---|---|---|
| id | BIGINT PK | Auto-increment |
| animation_type | VARCHAR | `pendulum` alebo `ball-beam` |
| user_token | VARCHAR | Anonymný token z cookie |
| city | VARCHAR NULL | Mesto z IP geolokácie |
| country | VARCHAR NULL | Štát z IP geolokácie |
| created_at / updated_at | TIMESTAMP | Časové pečiatky |

---

## 5. API Endpoints

Všetky `/api/*` endpointy vyžadujú hlavičku `X-API-KEY: <hodnota z .env>`, pokiaľ nie je uvedené inak.

| Metóda | Endpoint | Popis | Auth |
|---|---|---|---|
| POST | `/api/cas/execute` | Vykoná Octave príkaz | ✓ |
| POST | `/api/cas/clear` | Vymaže pamäť relácie | ✓ |
| GET | `/api/cas/export` | Export logov do CSV | ✓ |
| POST | `/api/simulation/run` | Spustí LQR simuláciu | ✓ |
| POST | `/api/animation/log` | Zaloguje spustenie animácie | — |
| GET | `/api/animation/stats` | Štatistiky animácií | — |
| GET | `/api/animation/detail/{type}` | Detail logov animácie | — |
| GET | `/api/docs/openapi` | OpenAPI JSON špecifikácia | — |
| GET | `/api/docs/pdf` | PDF dokumentácia | — |
| GET | `/api/docs/print` | HTML pre tlač | — |

---

## 6. Konfigurácia servera

### Inštalované programy na serveri

```bash
sudo apt install docker.io -y
# Docker Compose v2 (apt verzia 1.29.2 je stará, s touto verziou mi to nefungovalo)
sudo curl -L "https://github.com/docker/compose/releases/download/v2.27.1/docker-compose-linux-x86_64" \
     -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

### Konfigurácia nginx na serveri

Pridaný `location /` blok do existujúceho súboru `/etc/nginx/sites-available/node75.webte.fei.stuba.sk`:

```nginx
location / {
  proxy_pass http://localhost:8080;
  proxy_set_header Host $host;
  proxy_set_header X-Real-IP $remote_addr;
  proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
}
```

### Programy inštalované vo vnútri Docker kontajnera (php)

Tieto balíky sú inštalované automaticky cez `Dockerfile` a nevyžadujú manuálnu inštaláciu:

- `octave` — Octave matematický softvér
- `octave-control` — balík pre LQR, place(), ss(), lsim()
- PHP rozšírenia: `pdo_mysql`, `mbstring`, `exif`, `pcntl`, `bcmath`, `gd`, `zip`

---

## 7. Premenné .env

### `backend/.env` (nie je v repozitári — treba vytvoriť manuálne)

treba skopírovať example env

```bash
cp backend/.env.example backend/.env
```

a nastaviť hodnoty

```env
APP_NAME=Laravel
APP_ENV=production
APP_KEY=                          # vygeneruje php artisan key:generate
APP_DEBUG=false
APP_URL=https://node75.webte.fei.stuba.sk

DB_CONNECTION=mysql
DB_HOST=mariadb
DB_PORT=3306
DB_DATABASE=webte2
DB_USERNAME=webte2
DB_PASSWORD=webte2

CAS_API_KEY=moje_supertajne_api_heslo_123
SIMULATION_DELAY_MS=0
ANIMATION_COOLDOWN_MINUTES=10
```

### `frontend/.env` (nie je v repozitári — treba vytvoriť manuálne)

```env
VITE_API_KEY=moje_supertajne_api_heslo_123
```

---

## 8. Nasadenie na server (deployment)

### Požiadavky

- Ubuntu 20.04+ / Debian 11+
- Prístup cez SSH
- Sudo práva
- Port 80 a 443 dostupné (alebo iné podľa konfigurácie)

### Krok 1 — Inštalácia Dockeru

```bash
sudo apt update
sudo apt install docker.io -y

# Docker Compose v2
sudo curl -L "https://github.com/docker/compose/releases/download/v2.27.1/docker-compose-linux-x86_64" \
     -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Pridanie používateľa do docker skupiny
sudo usermod -aG docker $USER
newgrp docker

# Overenie
docker --version          # Docker version 29.x.x
docker-compose version    # Docker Compose version v2.27.1
```

### Krok 2 — Klonovanie repozitára

```bash
git clone https://github.com/vilpalenik/webte2_zav_zad
```

### Krok 3 — Vytvorenie `.env` súboru

```bash
cp backend/.env.example backend/.env
nano backend/.env
```

Vyplniť env podľa sekcie 7:

### Krok 4 — Build a spustenie kontajnerov

```bash
docker-compose up --build -d
```

Overenie, že všetky kontajnery bežia:
```bash
docker-compose ps
```

Očakávaný výstup — všetky 4 služby v stave `running`:
```
NAME                        STATUS
webte2_zav_zad-nginx-1      running
webte2_zav_zad-php-1        running
webte2_zav_zad-mariadb-1    running
webte2_zav_zad-phpmyadmin-1 running
```

### Krok 5 — Inštalácia PHP závislostí

```bash
docker-compose exec php composer install
```

### Krok 6 — Generovanie APP_KEY a migrácia databázy

```bash
docker-compose exec php php artisan key:generate
docker-compose exec php php artisan migrate
docker-compose exec php php artisan config:clear
```

### Krok 7 — Build frontendu

```bash
docker run --rm \
  -v $(pwd)/frontend:/app \
  -w /app \
  node:20-alpine \
  sh -c "npm ci && npm run build"
```

### Krok 8 — Konfigurácia serverového nginx (proxy)

Do existujúceho `server { listen 443 ssl; }` bloku v `/etc/nginx/sites-available/<hostname>` pridať:

```nginx
location / {
    proxy_pass http://localhost:8080;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
}
```

```bash
sudo nginx -t
sudo systemctl reload nginx
```

### Krok 9 — Overenie funkčnosti

```bash
# Test Octave
docker-compose exec php octave --eval "disp('ok')"
# Výstup: ok

# Test octave-control balíka
docker-compose exec php octave --eval "pkg load control; disp('control ok')"
# Výstup: control ok

# Test API
curl -H "X-API-KEY: moje_supertajne_api_heslo_123" https://node75.webte.fei.stuba.sk/api/animation/stats
# Výstup: {"status":"success","data":[...]}
```

---

## 9. Lokálny vývoj

Pre lokálny vývoj je potrebné dočasne pridať frontend službu do `docker-compose.yml` alebo spustiť Vite dev server manuálne.

### Vite lokálne

```bash
# Spustenie backend kontajnerov
docker-compose up -d

# Spustenie frontend dev servera lokálne (vyžaduje Node.js 20+)
cd frontend
npm install
npm run dev
```

Aplikácia dostupná na `http://localhost:5173`

### Možnosť B — Frontend v Dockeri - tak som to robil ja

Dočasne pridať do `docker-compose.yml`:

```yaml
  frontend:
    image: node:20-alpine
    working_dir: /app
    volumes:
      - ./frontend:/app
    ports:
      - "5173:5173"
    command: sh -c "npm install && npm run dev -- --host"
    depends_on:
      - nginx
```

---

## 10. Rozdelenie úloh

| # | Požiadavka | Viliam Páleník | Ignác Balla |
|---|---|---|---|
| 1 | Verzionovací systém (commity oboch členov) | ✓ | ✓ |
| 2 | Dvojjazyčnosť SK/EN, zostatok na podstránke | ✓ | |
| 3 | Responzívna stránka vrátane grafiky | ✓ | ✓ |
| 4 | REST API pre CAS, koeficient spomalenia v `.env` | | ✓ |
| 5 | API kľúč v konfiguračnom súbore | | ✓ |
| 6 | Formulár (syntax highlight) + animácia, zachovanie premenných | | ✓ |
| 7 | Dve animácie (kyvadlo, gulička) so synchronizovaným grafom | ✓ | |
| 8 | Logovanie všetkých požiadaviek do DB | | ✓ |
| 9 | Export logov do CSV | | ✓ |
| 10 | OpenAPI dokumentácia + dynamicky generované PDF s číslovaním strán | ✓ | |
| 11 | Štatistiky animácií, geolokácia, token v cookie, cooldown v `.env` | ✓ | |
| 12 | Docker kontajnerizácia | ✓ | |
| 13 | Demo video | | ✓ |

---

## 11. Bezpečnosť

- Všetky `/api/*` endpointy vyžadujú `X-API-KEY` hlavičku (definovanú v `.env`)
- API kľúč je uložený v `.env` súbore, ktorý nie je súčasťou repozitára
- `APP_DEBUG=false` v produkčnom prostredí
- Maximálna dĺžka príkazu: 10 000 znakov

---

## 12. Geolokácia

Aplikácia využíva bezplatnú službu [ip-api.com](http://ip-api.com) na zistenie mesta a štátu z IP adresy klienta. Volanie prebieha na strane servera s timeoutom 3 sekundy. Ak volanie zlyhá, polia štát a mesto zostanú prázdne.

Reálna IP adresa klienta je sprístupnená cez hlavičky `X-Real-IP` a `X-Forwarded-For`, ktoré nastavuje serverový nginx a posúva ich ďalej cez proxy do docker kontajnera.