import { Check, Minus } from "lucide-react";

import { PageHeader } from "@/components/cms/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { TBody, TD, TH, THead, TR, Table } from "@/components/ui/table";
import { requirePermission } from "@/lib/auth";
import {
  hasPermission,
  RESOURCES,
  ROLE_DESCRIPTIONS,
  ROLE_LABELS,
} from "@/lib/auth/permissions";
import { getEnabledModules } from "@/lib/cms/config";
import { ROLES, type PermissionAction } from "@/types/user";

export const metadata = { title: "Roles & permissions" };

const ACTIONS: PermissionAction[] = ["read", "create", "update", "delete", "publish"];

/**
 * Roles reference.
 *
 * Read-only in Phase 1, and honest about it: the matrix is generated from the
 * same `permissionsForRole` table the server enforces, so what you see here is
 * exactly what the server does. Custom roles are Phase 4 (docs/ROADMAP.md).
 */
export default async function RolesPage() {
  await requirePermission("roles.read");

  const enabled = new Set<string>(getEnabledModules());
  const resources = RESOURCES.filter((resource) => enabled.has(resource));

  return (
    <>
      <PageHeader
        title="Roles & permissions"
        description="What each role can do. These checks run on the server for every action, not just in the interface."
      />

      <div className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {ROLES.map((role) => (
            <Card key={role}>
              <CardBody className="space-y-1.5">
                <Badge tone={role === "super_admin" ? "info" : "neutral"}>
                  {ROLE_LABELS[role]}
                </Badge>
                <p className="text-sm text-muted-foreground">
                  {ROLE_DESCRIPTIONS[role]}
                </p>
              </CardBody>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader
            title="Permission matrix"
            description="Only modules enabled in cms.config.ts are listed."
          />

          <Table>
            <THead>
              <tr>
                <TH>Module</TH>
                {ROLES.map((role) => (
                  <TH key={role} className="text-center">
                    {ROLE_LABELS[role]}
                  </TH>
                ))}
              </tr>
            </THead>

            <TBody>
              {resources.map((resource) => (
                <TR key={resource}>
                  <TD className="font-medium capitalize">{resource}</TD>
                  {ROLES.map((role) => {
                    const granted = ACTIONS.filter((action) =>
                      hasPermission({ role }, `${resource}.${action}`),
                    );

                    return (
                      <TD key={role} className="text-center">
                        {granted.length === 0 ? (
                          <Minus
                            className="mx-auto size-4 text-muted-foreground/50"
                            aria-label="No access"
                          />
                        ) : granted.length === ACTIONS.length ? (
                          <Check
                            className="mx-auto size-4 text-[var(--success)]"
                            aria-label="Full access"
                          />
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            {granted.join(", ")}
                          </span>
                        )}
                      </TD>
                    );
                  })}
                </TR>
              ))}
            </TBody>
          </Table>

          <CardBody className="border-t border-border text-xs text-muted-foreground">
            Editing these bundles, and per-record ownership rules (an author
            editing only their own drafts), are Phase 4 work. To change a role
            today, edit <code>lib/auth/permissions.ts</code>.
          </CardBody>
        </Card>
      </div>
    </>
  );
}
