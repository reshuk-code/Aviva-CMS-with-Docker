"use client";

import { KeyRound, PencilLine, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useActionState, useState } from "react";
import { toast } from "sonner";

import {
  deleteUserAction,
  setUserPasswordAction,
  updateUserAction,
} from "@/app/admin/(dashboard)/users/actions";
import { Button } from "@/components/ui/button";
import { ConfirmButton } from "@/components/ui/confirm-button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { CheckboxField, Field, Input, Select } from "@/components/ui/field";
import { IDLE, type ActionState } from "@/lib/actions/result";
import { ROLE_DESCRIPTIONS, ROLE_LABELS } from "@/lib/auth/permissions";
import { ROLES, type CmsUser } from "@/types/user";

export function UserActions({
  user,
  isSelf,
  canUpdate,
  canDelete,
  canChangeRole,
}: {
  user: CmsUser;
  isSelf: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  canChangeRole: boolean;
}) {
  const router = useRouter();

  return (
    <div className="flex items-center justify-end gap-1">
      {canUpdate ? (
        <EditUserDialog
          user={user}
          isSelf={isSelf}
          canChangeRole={canChangeRole}
        />
      ) : null}

      {canUpdate ? <ResetPasswordDialog user={user} /> : null}

      {canDelete && !isSelf ? (
        <ConfirmButton
          variant="ghost"
          size="sm"
          title={`Delete ${user.name}?`}
          description="Their account is removed and they lose access immediately. Content they created stays."
          confirmLabel="Delete user"
          successMessage="User deleted."
          action={async () => {
            const result = await deleteUserAction(user.id);
            router.refresh();
            return result.ok ? undefined : { error: result.message };
          }}
        >
          <Trash2 className="size-4 text-destructive" />
          <span className="sr-only">Delete {user.name}</span>
        </ConfirmButton>
      ) : null}
    </div>
  );
}

function EditUserDialog({
  user,
  isSelf,
  canChangeRole,
}: {
  user: CmsUser;
  isSelf: boolean;
  canChangeRole: boolean;
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  // Closing the dialog happens inside the action rather than in an effect
  // keyed on the result: an effect that calls setState cascades an extra
  // render, and this reads in the order it actually happens.
  const [state, formAction, pending] = useActionState(
    async (previous: ActionState, formData: FormData) => {
      const result = await updateUserAction(previous, formData);
      if (result.ok) {
        toast.success(result.message ?? "Saved.");
        setOpen(false);
        router.refresh();
      } else if (result.message) {
        toast.error(result.message);
      }
      return result;
    },
    IDLE,
  );

  const errors = state.fieldErrors ?? {};

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <PencilLine className="size-4" />
          <span className="sr-only">Edit {user.name}</span>
        </Button>
      </DialogTrigger>

      <DialogContent title={`Edit ${user.name}`}>
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="id" value={user.id} />
          <input type="hidden" name="avatar" value={user.avatar ?? ""} />

          <Field id={`name-${user.id}`} label="Name" error={errors.name?.[0]} required>
            {(props) => <Input {...props} name="name" defaultValue={user.name} required />}
          </Field>

          <Field
            id={`email-${user.id}`}
            label="Email address"
            error={errors.email?.[0]}
            required
          >
            {(props) => (
              <Input {...props} name="email" type="email" defaultValue={user.email} required />
            )}
          </Field>

          <Field
            id={`role-${user.id}`}
            label="Role"
            error={errors.role?.[0]}
            hint={
              isSelf
                ? "You cannot change your own role."
                : canChangeRole
                  ? ROLE_DESCRIPTIONS[user.role]
                  : "Only a super admin can change roles."
            }
          >
            {(props) => (
              <Select
                {...props}
                name="role"
                defaultValue={user.role}
                disabled={!canChangeRole || isSelf}
              >
                {ROLES.map((role) => (
                  <option key={role} value={role}>
                    {ROLE_LABELS[role]}
                  </option>
                ))}
              </Select>
            )}
          </Field>

          {/* A disabled select posts nothing, so the current role travels too. */}
          {!canChangeRole || isSelf ? (
            <input type="hidden" name="role" value={user.role} />
          ) : null}

          <CheckboxField
            id={`active-${user.id}`}
            name="active"
            label="Account is active"
            hint={isSelf ? "You cannot deactivate yourself." : undefined}
            defaultChecked={user.active}
            disabled={isSelf}
          />
          {isSelf ? <input type="hidden" name="active" value="on" /> : null}

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" size="sm">
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" size="sm" disabled={pending}>
              {pending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ResetPasswordDialog({ user }: { user: CmsUser }) {
  const [open, setOpen] = useState(false);

  const [state, formAction, pending] = useActionState(
    async (previous: ActionState, formData: FormData) => {
      const result = await setUserPasswordAction(previous, formData);
      if (result.ok) {
        toast.success(result.message ?? "Password updated.");
        setOpen(false);
      } else if (result.message) {
        toast.error(result.message);
      }
      return result;
    },
    IDLE,
  );

  const errors = state.fieldErrors ?? {};

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <KeyRound className="size-4" />
          <span className="sr-only">Set a new password for {user.name}</span>
        </Button>
      </DialogTrigger>

      <DialogContent
        title={`New password for ${user.name}`}
        description="Send it to them over a channel they already trust, and ask them to change it."
      >
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="id" value={user.id} />

          <Field
            id={`password-${user.id}`}
            label="New password"
            error={errors.password?.[0]}
            hint="At least 10 characters."
            required
          >
            {(props) => (
              <Input
                {...props}
                name="password"
                type="password"
                autoComplete="new-password"
                required
              />
            )}
          </Field>

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" size="sm">
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" size="sm" disabled={pending}>
              {pending ? "Saving…" : "Set password"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
