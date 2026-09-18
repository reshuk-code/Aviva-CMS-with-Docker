import { mkdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
mkdirSync(new URL("../dist/", import.meta.url), { recursive: true });
// Explicit inputs exclude local credentials, customer data, and build caches.
const files = [
  "Dockerfile", ".dockerignore", "docker-compose.yml", "docker-compose.xcloud.yml",
  ".env.docker.example", "package.json", "package-lock.json", "next.config.ts",
  "tsconfig.json", "postcss.config.mjs", "eslint.config.mjs", "proxy.ts", "cms.config.ts",
  "adapters", "app", "components", "config", "hooks", "lib", "public", "schemas",
  "scripts", "types", "docs/XCLOUD_DOCKER.md",
];
const result = spawnSync("tar", [
  "--exclude=public/uploads", "--exclude=public/uploads/*",
  "-czf", "dist/cms-docker-source.tar.gz", ...files,
], { cwd: root, stdio: "inherit" });
if (result.error) throw result.error;
if (result.status !== 0) process.exit(result.status ?? 1);
console.log("Created dist/cms-docker-source.tar.gz (source bundle, not a prebuilt image).");
