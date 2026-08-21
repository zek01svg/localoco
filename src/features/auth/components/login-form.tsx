import { useForm } from "@tanstack/react-form";
import { Link } from "@tanstack/react-router";

import { Button } from "#client/components/ui/button";

import { useSignInMutation } from "../hooks/auth-queries";
import { AuthCard, FormErrorAlert, FormField } from "./shell";

function LoginFormHeader() {
  return (
    <div className="mb-6 text-center">
      <h1 className="font-display text-2xl tracking-tight">Welcome back</h1>
      <p className="text-muted-foreground mt-1.5 text-sm">Sign in to LocaLoco</p>
    </div>
  );
}

function LoginFormFooter() {
  return (
    <div className="text-muted-foreground mt-6 space-y-2 text-center text-xs">
      <p>
        <Link to="/forgot-password" className="text-primary font-medium hover:underline">
          Forgot your password?
        </Link>
      </p>
      <p>
        Not registered yet?{" "}
        <Link to="/signup" className="text-primary font-medium hover:underline">
          Sign up
        </Link>
      </p>
    </div>
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
    <AuthCard>
      <LoginFormHeader />

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
            onChange: ({ value }) => (value ? undefined : "Email is required"),
          }}
        >
          {field => (
            <FormField
              id={field.name}
              label="Email"
              type="email"
              autoComplete="email"
              placeholder="alice@example.com"
              disabled={signInMutation.isPending}
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
            onChange: ({ value }) => (value ? undefined : "Password is required"),
          }}
        >
          {field => (
            <FormField
              id={field.name}
              label="Password"
              type="password"
              autoComplete="current-password"
              placeholder="Enter your password"
              disabled={signInMutation.isPending}
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
              disabled={!canSubmit || signInMutation.isPending}
            >
              {signInMutation.isPending ? "Signing in..." : "Sign In"}
            </Button>
          )}
        </form.Subscribe>
      </form>

      <LoginFormFooter />
    </AuthCard>
  );
}
