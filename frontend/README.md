# Frontend — MACRO.AI

Dashboard futurístico (Vite + React) da Macroeconomic AI Platform: shell de navegação com 8 módulos (Visão Geral, Data Pipeline, Modelos Econométricos, Forecast Engine, Portfolio Manager, Risk Engine, Automação n8n, Segurança), estética cyberpunk (roxo/ciano) e fita de cotações macro ao vivo.

## Rodar localmente

```bash
npm install
npm run dev
```

Abre em `http://localhost:5173`.

## Build de produção

```bash
npm run build
npm run preview
```

## Estrutura

- `src/App.jsx` — shell de navegação + as 8 páginas de módulo (dados mock)
- `src/main.jsx` — entrypoint React
- `src/index.css` — reset mínimo
- `index.html` — carrega as fontes (Space Grotesk, Inter, IBM Plex Mono)

## Próximos passos

- Substituir os dados mock por chamadas reais ao backend/API
- Adicionar autenticação (SSO mencionado no log de auditoria)
- Conectar Forecast Engine e Portfolio Manager aos endpoints reais quando o backend estiver definido
