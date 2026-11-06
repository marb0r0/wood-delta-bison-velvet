# Global Football Intelligence

Plataforma de previsão de futebol com **FastAPI**, **Dixon-Coles**, **LangGraph**, **XGBoost** e frontend **React**.

Versão 0.3 — API + React + deploy no **Render**.

---

## Arranque local

### Backend

```bash
python -m venv .venv
source .venv/bin/activate
pip install -e '.[dev]'
python scripts/seed_demo.py   # opcional
uvicorn football_ai.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

- API: http://localhost:8000/docs  
- UI: http://localhost:3000  

---

## Deploy no Render

O ficheiro [`render.yaml`](./render.yaml) define:

| Serviço | Tipo | Função |
|---------|------|--------|
| `football-ai-db` | PostgreSQL (free) | Base de dados |
| `football-ai-api` | Web (Docker) | FastAPI + migrações Alembic |
| `football-ai-web` | Static | React (Vite build) |

### Passo a passo

1. Faz push deste repositório para GitHub/GitLab.
2. No [Render Dashboard](https://dashboard.render.com) → **New** → **Blueprint**.
3. Liga o repositório e confirma o `render.yaml`.
4. Aguarda o primeiro deploy (API + DB + static site).
5. **Configuração cruzada (obrigatória):**

   | Serviço | Variável | Valor |
   |---------|----------|--------|
   | **football-ai-api** | `CORS_ORIGINS` | URL do static site, ex. `https://football-ai-web.onrender.com` |
   | **football-ai-web** | `VITE_API_URL` | URL da API, ex. `https://football-ai-api.onrender.com` |

6. Faz **Manual Deploy** nos dois serviços (o frontend precisa de rebuild para embutir `VITE_API_URL`).

### Notas do plano free

- Serviços e Postgres podem **dormir** após inatividade; o 1.º request pode demorar 30–60 s.
- O `Dockerfile` corre `alembic upgrade head` no arranque.
- A app normaliza `postgres://` → `postgresql+psycopg://` automaticamente.

### Health check

```bash
curl https://<teu-api>.onrender.com/health
```

---

## Docker Compose (local)

```bash
cp .env.example .env
docker compose up --build
```

---

## API (exemplos)

```bash
curl -X POST https://<api>/api/v1/fixtures \
  -H 'Content-Type: application/json' \
  -d '{"id":"demo-001","competition":"Demo League","season":"2025/26","home_team":"Home FC","away_team":"Away FC"}'

curl -X POST https://<api>/api/v1/predict/quick \
  -H 'Content-Type: application/json' \
  -d '{"home_xg":1.8,"away_xg":1.2}'
```

---

## Arquitetura

```
├── render.yaml              # Blueprint Render (DB + API + UI)
├── Dockerfile               # API (PORT, alembic, uvicorn)
├── src/football_ai/         # FastAPI + Dixon-Coles + LangGraph
├── frontend/                # React + Vite + TypeScript
│   └── .env.example         # VITE_API_URL
├── migrations/              # Alembic
└── scripts/seed_demo.py
```

---

## Variáveis de ambiente

| Variável | Onde | Descrição |
|----------|------|-----------|
| `DATABASE_URL` | API | Ligação Postgres (Render injeta automaticamente) |
| `CORS_ORIGINS` | API | Origins permitidos (URL do frontend) |
| `APP_ENV` | API | `production` no Render |
| `VITE_API_URL` | Frontend (build) | URL pública da API |

---

## Limitações

- xG manuais · sem odds em tempo real · plano free pode dormir

---

## CI/CD (GitHub Actions)

Workflows em `.github/workflows/`:

| Workflow | Trigger | O que faz |
|----------|---------|-----------|
| **CI** | push / PR | Lint, **unit tests**, **integration tests (Postgres)**, build React, Docker |
| **Integration Tests** | push (paths), nightly, manual | Suite de integração em Python 3.11 e 3.12 + artefacto JUnit |
| **Deploy** | push `main`/`master` ou manual | Revalida e dispara Deploy Hooks do Render |
| **Dependabot** | semanal | PRs pip / npm / actions |

### Testes de integração

Corridos contra **PostgreSQL 16** (service container no GitHub Actions):

- ciclo completo de fixtures (CRUD + conflito 409)
- previsões Dixon-Coles + histórico
- validação Pydantic e endpoints 404
- persistência SQLAlchemy

Localmente (com Postgres a correr):

```bash
export RUN_INTEGRATION=1
export DATABASE_URL=postgresql+psycopg://football:football@localhost:5432/football_ai_test
pytest -m integration tests/integration -v
```

Unit tests apenas:

```bash
pytest -m "not integration" -q
```

### Secrets necessários (Deploy)

Em **GitHub → Settings → Secrets and variables → Actions**:

| Secret | Onde obter |
|--------|------------|
| `RENDER_API_DEPLOY_HOOK` | Render → `football-ai-api` → Settings → Deploy Hook |
| `RENDER_WEB_DEPLOY_HOOK` | Render → `football-ai-web` → Settings → Deploy Hook |
| `VITE_API_URL` (opcional no Deploy) | URL pública da API, ex. `https://football-ai-api.onrender.com` |

> Sem os hooks, o job de deploy valida o código e salta o trigger remoto (útil em forks).

### Fluxo

```
PR / push ──▶ CI (backend + frontend + docker)
                 │
                 ▼
            merge em main
                 │
                 ▼
            Deploy workflow ──▶ Render API + Web (hooks)
```

Também podes ativar **Auto-Deploy** no Render a partir do mesmo branch; o workflow de Deploy é opcional e garante que só se faz deploy depois dos testes.

---

## Integração sports-skills

Pacote [machina-sports/sports-skills](https://github.com/machina-sports/sports-skills) para dados live (ESPN, ClubElo, Understat).

```bash
pip install sports-skills
# ou, a partir do checkout local:
# PYTHONPATH=/path/to/sports-skills/src
```

### Endpoints novos

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/v1/live/status` | Disponibilidade do pacote |
| GET | `/api/v1/live/competitions` | Competições |
| GET | `/api/v1/live/schedule?date=` | Jogos do dia |
| GET | `/api/v1/live/standings/{season_id}` | Classificação |
| GET | `/api/v1/live/xg-estimate?home_team_id=&away_team_id=` | xG via ClubElo |
| POST | `/api/v1/live/import-schedule` | Importa jogos para a BD local |

No frontend: página **Dados Live** (`/live`) — carregar calendário, importar e prever com xG estimado.
