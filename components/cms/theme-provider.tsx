"use client";

/**
 * Kept as a re-export so the admin layout's import did not have to change when
 * `next-themes` was replaced. The implementation lives in `./theme`, alongside
 * the server-rendered script that applies the class before first paint.
 */
export { ThemeProvider } from "@/components/cms/theme";
