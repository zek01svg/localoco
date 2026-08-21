import type { ReactNode } from "react";

import { useForm } from "@tanstack/react-form";
import { Link } from "@tanstack/react-router";
import { CheckCircle2Icon, MailIcon } from "lucide-react";

import { Button } from "#client/components/ui/button";

import { useSignUpMutation } from "../hooks/auth-queries";
import { AuthCard, FormErrorAlert, FormField } from "./shell";

function SignupSuccessView({ email }: { email: string }) {
  return (
    <AuthCard className="text-center">
      <div className="flex flex-col items-center">
        <div className="bg-primary/10 text-primary mb-4 flex size-12 items-center justify-center rounded-full">
          <MailIcon aria-hidden="true" className="size-6" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight">Check your email</h2>
        <p className="text-muted-foreground mt-3 text-sm leading-relaxed">
          We sent a verification link to{" "}
          <span className="text-foreground font-semibold">{email}</span>. Please verify your email
          address to unlock community contributions and listings.
        </p>
        <div className="border-border/60 bg-muted/40 text-muted-foreground mt-6 flex w-full items-center gap-3 rounded-lg border p-3 text-left text-xs">
          <CheckCircle2Icon aria-hidden="true" className="text-primary size-5 shrink-0" />
          <span>You can close this window after confirming the email link.</span>
        </div>
        <Link
          to="/login"
          className="text-primary mt-6 inline-block text-sm font-medium hover:underline"
        >
          Return to sign in
        </Link>
      </div>
    </AuthCard>
  );
}

function SignupFormHeader() {
  return (
    <div className="mb-6 text-center">
      <h1 className="text-2xl font-bold tracking-tight">Join LocaLoco</h1>
      <p className="text-muted-foreground mt-1.5 text-sm">
        Discover local gems and connect with your neighborhood
      </p>
    </div>
  );
}

function SignupFormFooter() {
  return (
    <p className="text-muted-foreground mt-6 text-center text-xs">
      Already registered?{" "}
      <Link to="/login" className="text-primary font-medium hover:underline">
        Sign in
      </Link>
    </p>
  );
}

function SignupFormContainer({
  children,
  errorMessage,
}: {
  children: ReactNode;
  errorMessage: string | null;
}) {
  return (
    <AuthCard>
      <SignupFormHeader />

      {errorMessage ? <FormErrorAlert message={errorMessage} /> : null}

      {children}
      <SignupFormFooter />
    </AuthCard>
  );
}

export function SignupForm() {
  const signUpMutation = useSignUpMutation();

  const form = useForm({
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
    onSubmit: ({ value }) => {
      signUpMutation.mutate({
        name: value.name,
        email: value.email,
        password: value.password,
      });
    },
  });

  if (signUpMutation.isSuccess) {
    return <SignupSuccessView email={form.getFieldValue("email")} />;
  }

  const errorMessage = signUpMutation.error ? signUpMutation.error.message : null;

  return (
    <SignupFormContainer errorMessage={errorMessage}>
      <form
        onSubmit={e => {
          e.preventDefault();
          e.stopPropagation();
          void form.handleSubmit();
        }}
        className="space-y-4"
      >
        <form.Field
          name="name"
          validators={{ onChange: ({ value }) => (value ? undefined : "Full name is required") }}
        >
          {field => (
            <FormField
              id={field.name}
              label="Full Name"
              autoComplete="name"
              placeholder="Alice Tan"
              disabled={signUpMutation.isPending}
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={field.handleChange}
              error={field.state.meta.errors[0]}
            />
          )}
        </form.Field>

        <form.Field
          name="email"
          validators={{ onChange: ({ value }) => (value ? undefined : "Email is required") }}
        >
          {field => (
            <FormField
              id={field.name}
              label="Email"
              type="email"
              autoComplete="email"
              placeholder="alice@example.com"
              disabled={signUpMutation.isPending}
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={field.handleChange}
              error={field.state.meta.errors[0]}
            />
          )}
        </form.Field>

        <form.Field
          name="password"
          validators={{
            onChange: ({ value }) =>
              value
                ? value.length < 8
                  ? "Password must be at least 8 characters long."
                  : undefined
                : "Password is required",
          }}
        >
          {field => (
            <FormField
              id={field.name}
              label="Password"
              type="password"
              autoComplete="new-password"
              placeholder="At least 8 characters"
              disabled={signUpMutation.isPending}
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
            onChange: ({ value, fieldApi }) =>
              value
                ? value === fieldApi.form.getFieldValue("password")
                  ? undefined
                  : "Passwords do not match. Please try again."
                : "Please confirm your password",
          }}
        >
          {field => (
            <FormField
              id={field.name}
              label="Confirm Password"
              type="password"
              autoComplete="new-password"
              placeholder="Re-enter password"
              disabled={signUpMutation.isPending}
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
              disabled={!canSubmit || signUpMutation.isPending}
            >
              {signUpMutation.isPending ? "Joining..." : "Join LocaLoco"}
            </Button>
          )}
        </form.Subscribe>
      </form>
    </SignupFormContainer>
  );
}
