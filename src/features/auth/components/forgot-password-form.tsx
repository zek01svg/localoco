import { useForm } from "@tanstack/react-form";
import { MailCheckIcon } from "lucide-react";

import { Button } from "#client/components/ui/button";

import { useRequestPasswordResetMutation } from "../hooks/auth-queries";
import { AuthCard, FormErrorAlert, FormField } from "./shell";

function ForgotPasswordHeader() {
  return (
    <div className="mb-6 text-center">
      <h1 className="font-display text-2xl tracking-tight">Forgot your password?</h1>
      <p className="text-muted-foreground mt-1.5 text-sm">
        Enter your email and we will send you a reset link.
      </p>
    </div>
  );
}

function RequestSentState() {
  return (
    <AuthCard className="text-center">
      <div className="flex flex-col items-center">
        <div className="bg-primary/10 text-primary mb-4 flex size-12 items-center justify-center rounded-full">
          <MailCheckIcon aria-hidden="true" className="size-6" />
        </div>
        <h1 className="font-display text-2xl tracking-tight">Check your email</h1>
        <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
          If this email is registered, a password reset link is on its way. The link expires in 10
          minutes.
        </p>
      </div>
    </AuthCard>
  );
}

export function ForgotPasswordForm() {
  const requestResetMutation = useRequestPasswordResetMutation();

  const form = useForm({
    defaultValues: {
      email: "",
    },
    onSubmit: ({ value }) => {
      requestResetMutation.mutate(value.email);
    },
  });

  if (requestResetMutation.isSuccess) {
    return <RequestSentState />;
  }

  const errorMessage = requestResetMutation.error ? requestResetMutation.error.message : null;

  return (
    <AuthCard>
      <ForgotPasswordHeader />

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
          name="email"
          validators={{
            onChange: ({ value }) =>
              /^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(value) ? undefined : "Enter a valid email address",
          }}
        >
          {field => (
            <FormField
              id={field.name}
              label="Email"
              type="email"
              autoComplete="email"
              placeholder="alice@example.com"
              disabled={requestResetMutation.isPending}
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
              disabled={!canSubmit || requestResetMutation.isPending}
            >
              {requestResetMutation.isPending ? "Sending..." : "Send Reset Link"}
            </Button>
          )}
        </form.Subscribe>
      </form>
    </AuthCard>
  );
}
