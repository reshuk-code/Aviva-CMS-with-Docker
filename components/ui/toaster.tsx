"use client";

import { Toaster as Sonner } from "sonner";

import { useTheme } from "@/components/cms/theme";

/** Toast host. Mounted once in the admin layout. */
export function Toaster() {
  const { resolvedTheme } = useTheme();

  return (
    <Sonner
      theme={resolvedTheme === "dark" ? "dark" : "light"}
      position="bottom-right"
      toastOptions={{
        classNames: {
          toast:
            "!bg-card !text-card-foreground !border-border !shadow-lg !rounded-md",
          description: "!text-muted-foreground",
        },
      }}
    />
  );
}
