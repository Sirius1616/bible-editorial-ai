import {
  defineRailway,
  github,
  group,
  postgres,
  preserve,
  project,
  service,
} from "railway/iac";

export default defineRailway(() => {
  const db = postgres("postgres");

  const backend = service("backend", {
    source: github("Sirius1616/bible-editorial-ai", { rootDirectory: "backend" }),
    healthcheck: "/health",
    healthcheckTimeout: 60,
    env: {
      DATABASE_URL: db.env.DATABASE_URL,
      CORS_ORIGINS: "https://${{frontend.RAILWAY_PUBLIC_DOMAIN}}",
      FRONTEND_URL: "https://${{frontend.RAILWAY_PUBLIC_DOMAIN}}",
      ENVIRONMENT: "production",
      SECRET_KEY: preserve(),
      ANTHROPIC_API_KEY: preserve(),
      BIBLE_API_KEY: preserve(),
    },
  });

  const frontend = service("frontend", {
    source: github("Sirius1616/bible-editorial-ai", { rootDirectory: "frontend" }),
    env: {
      BACKEND_URL: "https://${{backend.RAILWAY_PUBLIC_DOMAIN}}",
    },
  });

  const app = group("App", [db, backend, frontend]);

  return project("bible-editorial-ai", {
    resources: [app],
  });
});