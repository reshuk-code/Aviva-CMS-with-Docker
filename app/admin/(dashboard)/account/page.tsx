import { ChangePasswordForm } from "@/app/admin/(dashboard)/account/change-password-form";
import { PageHeader } from "@/components/cms/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { requireSession } from "@/lib/auth";
import { ROLE_DESCRIPTIONS, ROLE_LABELS } from "@/lib/auth/permissions";
import { users } from "@/lib/cms/repositories/users";
import { formatDateTime } from "@/lib/utils";
import { notFound } from "next/navigation";

export const metadata = { title: "Your account" };

export default async function AccountPage() {
  const session = await requireSession();
  const user = await users.get(session.userId);
  if (!user) notFound();

  return (
    <>
      <PageHeader title="Your account" />

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader title="Details" />
          <CardBody className="space-y-3 text-sm">
            <div className="flex justify-between gap-4 border-b border-border pb-2">
              <span className="text-muted-foreground">Name</span>
              <span className="font-medium">{user.name}</span>
            </div>
            <div className="flex justify-between gap-4 border-b border-border pb-2">
              <span className="text-muted-foreground">Email</span>
              <span className="font-medium">{user.email}</span>
            </div>
            <div className="flex items-center justify-between gap-4 border-b border-border pb-2">
              <span className="text-muted-foreground">Role</span>
              <Badge tone="info">{ROLE_LABELS[user.role]}</Badge>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Last signed in</span>
              <span>{formatDateTime(user.lastLoginAt)}</span>
            </div>

            <p className="pt-2 text-xs text-muted-foreground">
              {ROLE_DESCRIPTIONS[user.role]}
            </p>
          </CardBody>
        </Card>

        <ChangePasswordForm />
      </div>
    </>
  );
}
