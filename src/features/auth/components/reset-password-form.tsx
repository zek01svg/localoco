import { useForm } from "@tanstack/react-form";
import { Link } from "@tanstack/react-router";
import { AlertTriangleIcon, CheckCircle2Icon } from "lucide-react";

import { Button } from "#client/components/ui/button";

import { useResetPasswordMutation } from "../hooks/auth-queries";
import { AuthCard, FormErrorAlert, FormField } from "./shell";

interface ResetPasswordFormProps {
  token?: string;
}

function ResetSuccessState() {
  return (
    <AuthCard className="text-center">
      <div className="flex flex-col items-center">
        <div className="bg-primary/10 text-primary mb-4 flex size-12 items-center justify-center rounded-full">
          <CheckCircle2Icon aria-hidden="true" className="size-6" />
        </div>
        <h1 className="font-display text-2xl tracking-tight">Password updated</h1>
        <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
          Your password has been changed and all previous sessions were signed out.
        </p>
        <Link
          to="/login"
          className="bg-primary text-primary-foreground hover:bg-primary/90 mt-6 inline-flex h-9 items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors"
        >
          Go to Sign In
        </Link>
      </div>
    </AuthCard>
  );
}

function ResetErrorState({ errorMessage }: { errorMessage: string | null }) {
  return (
    <AuthCard className="text-center">
      <div className="flex flex-col items-center">
        <div className="bg-destructive/10 text-destructive mb-4 flex size-12 items-center justify-center rounded-full">
          <AlertTriangleIcon aria-hidden="true" className="size-6" />
        </div>
        <h1 className="font-display text-2xl tracking-tight">Reset link failed</h1>
        <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
          {errorMessage ?? "This reset link is invalid or has expired."}
        </p>
        <Link
          to="/forgot-password"
          className="bg-primary text-primary-foreground hover:bg-primary/90 mt-6 inline-flex h-9 items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors"
        >
          Request a new link
        </Link>
      </div>
    </AuthCard>
  );
}

export function ResetPasswordForm({ token }: ResetPasswordFormProps) {
  const resetPasswordMutation = useResetPasswordMutation();

  const form = useForm({
    defaultValues: {
      newPassword: "",
      confirmPassword: "",
    },
    validators: {
      onChange: ({ value }) =>
        value.confirmPassword && value.newPassword !== value.confirmPassword
          ? "Passwords do not match"
          : undefined,
    },
    onSubmit: ({ value }) => {
      if (!token) return;
      resetPasswordMutation.mutate({ token, newPassword: value.newPassword });
    },
  });

  if (!token) {
    return (
      <ResetErrorState errorMessage="No reset token was provided in the link. Request a new one below." />
    );
  }

  if (resetPasswordMutation.isSuccess) {
    return <ResetSuccessState />;
  }

  const errorMessage = resetPasswordMutation.error ? resetPasswordMutation.error.message : null;

  return (
    <AuthCard>
      <div className="mb-6 text-center">
        <h1 className="font-display text-2xl tracking-tight">Set a new password</h1>
        <p className="text-muted-foreground mt-1.5 text-sm">
          Choose a strong password you do not use elsewhere.
        </p>
      </div>

      {errorMessage ? <FormErrorAlert message={errorMessage} /> : null}

      <form
        onSubmit={e => {
          e.preventDefault();
          e.stopPropagation();
          void form.handleSubmit();
        }}
        className="space-y-4"
      >
        <form.Field
          name="newPassword"
          validators={{
            onChange: ({ value }) =>
              value.length >= 8 ? undefined : "Password must be at least 8 characters",
          }}
        >
          {field => (
            <FormField
              id={field.name}
              label="New password"
              type="password"
              autoComplete="new-password"
              placeholder="Enter your new password"
              disabled={resetPasswordMutation.isPending}
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={field.handleChange}
              error={field.state.meta.errors[0]}
            />
          )}
        </form.Field>

        <form.Field
          name="confirmPassword"
          validators={{
            onChange: ({ value }) => (value ? undefined : "Confirm your new password"),
          }}
        >
          {field => (
            <FormField
              id={field.name}
              label="Confirm new password"
              type="password"
              autoComplete="new-password"
              placeholder="Re-enter your new password"
              disabled={resetPasswordMutation.isPending}
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={field.handleChange}
              error={field.state.meta.errors[0]}
            />
          )}
        </form.Field>

        <form.Subscribe selector={state => [state.canSubmit, state.isSubmitting]}>
          {([canSubmit]) => (
            <Button
              type="submit"
              className="w-full"
              disabled={!canSubmit || resetPasswordMutation.isPending}
            >
              {resetPasswordMutation.isPending ? "Updating..." : "Update Password"}
            </Button>
          )}
        </form.Subscribe>
      </form>
    </AuthCard>
  );
}
