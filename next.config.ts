import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,

  // Pin the workspace root. Without this, Turbopack walks up and finds a
  // stray lockfile in the home directory and warns on every build.
  turbopack: {
    root: __dirname,
  },

  /**
   * Database drivers that are NOT dependencies of this template. Marking them
   * external means the bundler emits a plain require() instead of trying to
   * resolve them at build time, so a project that never selects the MongoDB
   * adapter does not need the driver installed. The adapter catches the
   * missing-module error and reports it with install instructions.
   */
  serverExternalPackages: ["mongodb", "firebase-admin"],
};

export default nextConfig;
