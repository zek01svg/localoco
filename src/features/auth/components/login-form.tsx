import { useForm } from "@tanstack/react-form";
import { Link } from "@tanstack/react-router";

import { Button } from "#client/components/ui/button";
import { Input } from "#client/components/ui/input";
import { Label } from "#client/components/ui/label";
import { Skeleton } from "#client/components/ui/skeleton";

import { useSignInMutation } from "../hooks/auth-queries";

export function LoginFormSkeleton() {
  return (
    <div className="bg-card text-card-foreground border-border mx-auto max-w-md space-y-6 rounded-xl border p-8 shadow-sm">
      <div className="space-y-2 text-center">
        <Skeleton className="mx-auto h-7 w-40" />
        <Skeleton className="mx-auto h-4 w-56" />
      </div>
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Skeleton className="h-4 w-12" />
          <Skeleton className="h-9 w-full" />
        </div>
        <div className="space-y-1.5">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-9 w-full" />
        </div>
        <Skeleton className="h-9 w-full rounded-md" />
      </div>
    </div>
  );
}

function LoginFormHeader() {
  return (
    <div className="mb-6 text-center">
      <h1 className="text-2xl font-bold tracking-tight">Welcome back</h1>
      <p className="text-muted-foreground mt-1.5 text-sm">Sign in to LocaLoco</p>
    </div>
  );
}

function LoginFormFooter() {
  return (
    <p className="text-muted-foreground mt-6 text-center text-xs">
      Not registered yet?{" "}
      <Link to="/signup" className="text-primary font-medium hover:underline">
        Sign up
      </Link>
    </p>
  );
}

export function LoginForm() {
  const signInMutation = useSignInMutation();

  const form = useForm({
    defaultValues: {
      email: "",
      password: "",
    },
    onSubmit: ({ value }) => {
      signInMutation.mutate(value);
    },
  });

  const errorMessage = signInMutation.error ? signInMutation.error.message : null;

  return (
    <div className="bg-card text-card-foreground border-border mx-auto max-w-md rounded-xl border p-8 shadow-sm">
      <LoginFormHeader />

      {errorMessage ? (
        <div
          role="alert"
          aria-live="polite"
          className="border-destructive/30 bg-destructive/10 text-destructive mb-6 rounded-lg border p-3.5 text-sm font-medium"
        >
          {errorMessage}
        </div>
      ) : null}

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
            onChange: ({ value }) => (value ? undefined : "Email is required"),
          }}
        >
          {field => (
            <div className="space-y-1.5">
              <Label htmlFor={field.name}>Email</Label>
              <Input
                id={field.name}
                name={field.name}
                type="email"
                required
                autoComplete="email"
                placeholder="alice@example.com"
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={e => {
                  field.handleChange(e.target.value);
                }}
                disabled={signInMutation.isPending}
              />
              {field.state.meta.errors[0] ? (
                <p className="text-destructive text-xs">{field.state.meta.errors[0]}</p>
              ) : null}
            </div>
          )}
        </form.Field>

        <form.Field
          name="password"
          validators={{
            onChange: ({ value }) => (value ? undefined : "Password is required"),
          }}
        >
          {field => (
            <div className="space-y-1.5">
              <Label htmlFor={field.name}>Password</Label>
              <Input
                id={field.name}
                name={field.name}
                type="password"
                required
                autoComplete="current-password"
                placeholder="Enter your password"
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={e => {
                  field.handleChange(e.target.value);
                }}
                disabled={signInMutation.isPending}
              />
              {field.state.meta.errors[0] ? (
                <p className="text-destructive text-xs">{field.state.meta.errors[0]}</p>
              ) : null}
            </div>
          )}
        </form.Field>

        <form.Subscribe selector={state => [state.canSubmit, state.isSubmitting]}>
          {([canSubmit]) => (
            <Button
              type="submit"
              className="w-full"
              disabled={!canSubmit || signInMutation.isPending}
            >
              {signInMutation.isPending ? "Signing in..." : "Sign In"}
            </Button>
          )}
        </form.Subscribe>
      </form>

      <LoginFormFooter />
    </div>
  );
}
