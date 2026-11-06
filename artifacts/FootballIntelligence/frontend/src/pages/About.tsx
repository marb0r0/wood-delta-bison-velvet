const apiBase = import.meta.env.VITE_API_URL || "(proxy local / mesma origem)";

export default function About() {
  return (
    <>
      <div className="page-header">
        <h1>Sobre</h1>
        <p>Global Football Intelligence</p>
      </div>

      <div className="card">
        <p style={{ marginBottom: "1rem", color: "var(--text-muted)", lineHeight: 1.7 }}>
          Plataforma de previsão de resultados de futebol baseada em modelos estatísticos
          transparentes. O motor principal usa a correção de Dixon-Coles sobre uma matriz
          de Poisson independente; o XGBoost está disponível como módulo de treino separado.
        </p>

        <div className="card-title">Stack</div>
        <ul style={{ color: "var(--text-muted)", lineHeight: 1.9, marginBottom: "1.25rem", paddingLeft: "1.2rem" }}>
          <li>Backend: FastAPI + SQLAlchemy + LangGraph</li>
          <li>Modelo: Dixon-Coles (inferência) · XGBoost (treino)</li>
          <li>Frontend: React + Vite + TypeScript + Recharts</li>
          <li>BD: SQLite (dev) ou PostgreSQL (Docker / Render)</li>
          <li>Deploy: Render (Blueprint em render.yaml)</li>
        </ul>

        <div className="card-title">API</div>
        <p style={{ color: "var(--text-muted)", marginBottom: "1rem" }}>
          Base URL: <code style={{ color: "var(--accent)" }}>{apiBase}</code>
          {import.meta.env.VITE_API_URL && (
            <>
              {" · "}
              <a
                href={`${import.meta.env.VITE_API_URL}/docs`}
                target="_blank"
                rel="noreferrer"
                style={{ color: "var(--accent)" }}
              >
                Swagger /docs
              </a>
            </>
          )}
        </p>

        <div className="card-title">Limitações atuais</div>
        <ul style={{ color: "var(--text-muted)", lineHeight: 1.9, paddingLeft: "1.2rem" }}>
          <li>xG fornecidos manualmente (sem estimador treinado integrado)</li>
          <li>Dixon-Coles não ajusta forças ataque/defesa a partir de histórico</li>
          <li>Sem odds em tempo real, lesões ou lineups</li>
          <li>Matriz truncada em 10 golos e renormalizada</li>
        </ul>
      </div>
    </>
  );
}
