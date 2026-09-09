import Link from "next/link";
import type { ReactNode } from "react";

import { cms } from "@/lib/cms";

/**
 * Public site layout.
 *
 * This file is the developer's, not the CMS's. It shows the intended pattern —
 * fetch data through the SDK in a Server Component, render it however you like
 * — and is meant to be replaced wholesale on a real client project.
 */
export default async function FrontendLayout({
  children,
}: {
  children: ReactNode;
}) {
  const [site, menu] = await Promise.all([
    cms.settings.get(),
    cms.navigation.get("main"),
  ]);

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-border">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-6 px-6 py-4">
          <Link href="/" className="font-semibold tracking-tight">
            {site.siteName}
          </Link>

          {menu.length > 0 ? (
            <nav aria-label="Main">
              <ul className="flex flex-wrap items-center gap-5 text-sm">
                {menu.map((item) => (
                  <li key={item.id}>
                    {item.href ? (
                      <Link
                        href={item.href}
                        target={item.openInNewTab ? "_blank" : undefined}
                        rel={item.openInNewTab ? "noreferrer" : undefined}
                        className="text-muted-foreground transition-colors hover:text-foreground"
                      >
                        {item.label}
                      </Link>
                    ) : (
                      <span className="text-muted-foreground">{item.label}</span>
                    )}
                  </li>
                ))}
              </ul>
            </nav>
          ) : null}
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-border">
        <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-3 px-6 py-6 text-sm text-muted-foreground">
          <p>
            © {new Date().getFullYear()} {site.siteName}
          </p>
          {site.contact.email ? (
            <a href={`mailto:${site.contact.email}`} className="hover:text-foreground">
              {site.contact.email}
            </a>
          ) : null}
        </div>
      </footer>
    </div>
  );
}
