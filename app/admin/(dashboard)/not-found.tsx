import { FileQuestion } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";

/**
 * The admin 404.
 *
 * Inside the (dashboard) group so it keeps the sidebar and header: an editor
 * who lands here is still signed in and still needs the navigation. The common
 * way to arrive is an edit screen whose record has since been deleted — every
 * `[id]/page.tsx` calls `notFound()` when the lookup misses — so the wording
 * assumes a missing record rather than a mistyped address.
 */
export const metadata = { title: "Not found" };

export default function AdminNotFound() {
  return (
    <Card>
      <CardBody className="flex flex-col items-center gap-4 px-6 py-16 text-center">
        <span className="grid size-12 place-items-center rounded-lg bg-muted text-muted-foreground">
          <FileQuestion className="size-6" />
        </span>

        <div className="space-y-1.5">
          <h1 className="text-lg font-semibold tracking-tight">
            That page is not here
          </h1>
          <p className="mx-auto max-w-md text-sm text-muted-foreground">
            It may have been deleted, or the address may be wrong. Nothing has
            gone wrong with your account.
          </p>
        </div>

        <Button asChild size="sm">
          <Link href="/admin">Back to the dashboard</Link>
        </Button>
      </CardBody>
    </Card>
  );
}
