# Pós-deploy no Render

1. Abre o serviço **football-ai-api** → Environment.
2. Define `CORS_ORIGINS` = URL pública do static site  
   (ex.: `https://football-ai-web.onrender.com`).
3. Abre o serviço **football-ai-web** → Environment.
4. Define `VITE_API_URL` = URL pública da API  
   (ex.: `https://football-ai-api.onrender.com`).
5. **Manual Deploy** em ambos os serviços (o frontend precisa de rebuild
   para embutir `VITE_API_URL` no bundle).

Nota: no plano free o Postgres e os serviços web podem dormir após
inatividade; o primeiro request pode demorar ~30–60s.
