# CLAUDE.md

## 1. Project Overview
Plataforma de monitoreo de filtraciones de credenciales y chatter en dark‑web/Telegram, con enriquecimiento de IOCs y automatización de remediación.  
Stack: TypeScript, React, Cloudflare Workers (backend), D1 (SQLite), OAuth 2.0, Chart.js.

## 2. Architecture Map
- `/src/collector` – Workers que recolectan datos de fuentes externas (APIs simuladas, web scraping).  
- `/src/normalizer` – Funciones que convierten registros crudos a esquema estándar.  
- `/src/detector` – Lógica de detección, enriquecimiento (OTX, AbuseIPDB) y generación de alertas.  
- `/src/api` – Endpoints REST/GraphQL para consultar fugas y gestionar configuraciones.  
- `/src/web` – Aplicación React (dashboard, tablas, gráficos, filtros).  
- `/infra` – Scripts de despliegue (wrangler, migrations D1).  
- `/tests` – Tests unitarios e integración (Vitest, Playwright).  
- `wrangler.toml` – Configuración de Cloudflare Workers.  
- `package.json` – Dependencias y scripts (dev, test, build, deploy).

## 3. Common Commands
- `bun install` – Instalar dependencias.  
- `bun run dev` – Iniciar Workers y dev server de React (localhost:5173).  
- `bun run test` – Ejecutar suite de pruebas.  
- `bun run lint` – Ejecutar ESLint + Prettier.  
- `bun run build` – Bundlar frontend para producción.  
- `bun run deploy` – Desplegar Workers a través de Wrangler.  
- `bun run migrate` – Aplicar migraciones D1.

## 4. Code Conventions (no cubiertas por linter/formatter)
- Usar **named exports** en módulos TypeScript; evitar `export default` salvo en componentes React principales.  
- Nombrar archivos con `kebab-case`; componentes React con `PascalCase`.  
- Agrupar imports: primero tipos, luego librerías externas, luego módulos internos.  
- Todos los objetos de fuga deben seguir la interfaz `LeakRecord` definida en `src/types.ts`.  
- Los Workers deben recibir configuración únicamente mediante variables de entorno vinculadas en `wrangler.toml` (no hardcodear secrets).

## 5. Gotchas & Warnings
- El agente tiende a crear nuevas carpetas al generar tests; explícitamente indicar que los tests van en `__tests__` al lado del archivo bajo prueba o en la carpeta `/tests` según convención del proyecto.  
- Al solicitar llamadas a APIs externas, el agente puede olvidar agregar manejo de errores y timeouts; revisar siempre los bloques `try/catch` y los parámetros de `fetch`.  
- Los secrets de producción nunca deben aparecer en prompts; usar la bandera de seguridad de Claude Code para bloquear escritura en `.env` y `secrets.json`.  
- El agente a veces genera componentes React con estado innecesario; preferir derivar estado de props o usar React Query para datos del servidor.

## 6. Git & Workflow
- Rama principal: `main`.  
- Ramas de feature: `feature/<short-description>`.  
- Mensajes de commit: `tipo(scope): descripción breve` (ej. `feat(api): agregar endpoint /enrich`).  
- Pull Requests deben pasar revisión humana y todos los checks de CI (test, lint, build) antes del merge.  
- Despliegues a staging se hacen automáticamente al mergear en `main` mediante GitHub Actions (script generado por Claude Code).

## 7. Pointers (Progressive Disclosure)
- Para patrones de autenticación y RBAC, ver `src/auth/README.md`.  
- Para esquemas D1 y migraciones, ver `infra/d1/README.md`.  
- Para configuración de webhooks y integraciones SIEM, ver `src/api/webhooks.md`.  
- Para guía de contribución y proceso de liberación, ver `CONTRIBUTING.md` y `RELEASE.md`.
