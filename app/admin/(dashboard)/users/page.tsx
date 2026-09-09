import { Users as UsersIcon } from "lucide-react";

import { CreateUserForm } from "@/app/admin/(dashboard)/users/create-user-form";
import { UserActions } from "@/app/admin/(dashboard)/users/user-actions";
import { PageHeader } from "@/components/cms/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader } from "@/components/ui/card";
import { Pagination } from "@/components/ui/pagination";
import {
  EmptyState,
  TBody,
  TD,
  TH,
  THead,
  TR,
  Table,
} from "@/components/ui/table";
import { requirePermission } from "@/lib/auth";
import { hasPermission, ROLE_LABELS } from "@/lib/auth/permissions";
import { users } from "@/lib/cms/repositories/users";
import { listOptionsSchema } from "@/schemas/common";
import { formatRelative } from "@/lib/utils";

export const metadata = { title: "Users" };

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requirePermission("users.read");
  const params = await searchParams;

  const options = listOptionsSchema.parse({
    page: params.page,
    perPage: params.perPage,
    search: params.search,
    sort: params.sort ?? "name",
    order: params.order ?? "asc",
  });

  const result = await users.list(options);

  const canCreate = hasPermission({ role: session.role }, "users.create");
  const canUpdate = hasPermission({ role: session.role }, "users.update");
  const canDelete = hasPermission({ role: session.role }, "users.delete");
  const isSuperAdmin = session.role === "super_admin";

  return (
    <>
      <PageHeader
        title="Users"
        description="Who can sign in to the admin, and what each of them is allowed to do."
      />

      <div className="space-y-5">
        {canCreate ? <CreateUserForm canAssignSuperAdmin={isSuperAdmin} /> : null}

        <Card>
          <CardHeader
            title="Team"
            description={`${result.total} account${result.total === 1 ? "" : "s"}`}
          />

          {result.items.length === 0 ? (
            <EmptyState
              icon={<UsersIcon className="size-8" />}
              title="No users found"
            />
          ) : (
            <Table>
              <THead>
                <tr>
                  <TH>Name</TH>
                  <TH className="hidden sm:table-cell">Role</TH>
                  <TH className="hidden lg:table-cell">Last signed in</TH>
                  <TH className="text-right">Actions</TH>
                </tr>
              </THead>

              <TBody>
                {result.items.map((user) => (
                  <TR key={user.id}>
                    <TD>
                      <span className="font-medium">{user.name}</span>
                      <span className="block text-xs text-muted-foreground">
                        {user.email}
                      </span>
                      <span className="mt-1 block sm:hidden">
                        <Badge tone={user.active ? "neutral" : "danger"}>
                          {ROLE_LABELS[user.role]}
                        </Badge>
                      </span>
                    </TD>

                    <TD className="hidden sm:table-cell">
                      <Badge tone={user.active ? "info" : "neutral"}>
                        {ROLE_LABELS[user.role]}
                      </Badge>
                      {!user.active ? (
                        <Badge tone="danger" className="ml-1.5">
                          Deactivated
                        </Badge>
                      ) : null}
                    </TD>

                    <TD className="hidden whitespace-nowrap text-xs text-muted-foreground lg:table-cell">
                      {user.lastLoginAt ? formatRelative(user.lastLoginAt) : "Never"}
                    </TD>

                    <TD className="text-right">
                      <UserActions
                        user={user}
                        isSelf={user.id === session.userId}
                        canUpdate={canUpdate}
                        canDelete={canDelete}
                        canChangeRole={isSuperAdmin}
                      />
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}

          <Pagination
            result={result}
            basePath="/admin/users"
            searchParams={{ search: options.search || undefined }}
          />
        </Card>
      </div>
    </>
  );
}
