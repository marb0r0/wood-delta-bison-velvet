# Integrações de dados

Esta app une várias fontes open-source num hub **pré-jogo + live**.

| Repositório | Papel na app | Estado |
|-------------|--------------|--------|
| [machina-sports/sports-skills](https://github.com/machina-sports/sports-skills) | ESPN calendário, classificações, ClubElo → xG | **Principal (pré-jogo)** |
| [manucabral/EasySoccerData](https://github.com/manucabral/EasySoccerData) | Sofascore live + eventos do dia | **Live** (pode ser bloqueado em IPs datacenter) |
| [karidasd/football-predictions](https://github.com/karidasd/football-predictions) | Padrão API-Football (fixtures + predictions) | **Opcional** via `API_FOOTBALL_KEY` |
| [FootballGPT/football-ai](https://github.com/FootballGPT/football-ai) | Pipeline XGBoost legado (deps antigas) | Referência de features; não embutido (incompatível com stack atual) |
| [Haemon-Yang/FootballBettingAgent](https://github.com/Haemon-Yang/FootballBettingAgent) | Agentes LLM + scraper PL | Referência de UX/RAG; não embutido (requer LLM keys) |

## Motor de previsão local

1. Estimar xG (ClubElo via sports-skills, ou prior 1.45/1.15)
2. Dixon-Coles → 1X2, O2.5, BTTS, matriz de golos

## Variáveis

```bash
# Obrigatório para ESPN/ClubElo
pip install sports-skills feedparser requests

# Live Sofascore
pip install EasySoccerData curl-cffi

# Opcional API-Football
export API_FOOTBALL_KEY=sua_chave
```

## Endpoints

- `GET /api/v1/live/board` — jogos live
- `GET /api/v1/live/prematch?date=` — calendário pré-jogo
- `POST /api/v1/live/predict` — previsão com xG automático
- `POST /api/v1/live/import-schedule` — gravar jogos na BD
