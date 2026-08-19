import { useForm } from "@tanstack/react-form";
import { useState } from "react";

import { Button } from "#client/components/ui/button";
import { FormErrorAlert, FormField } from "#client/features/auth";

import { useChangeEmailMutation } from "../hooks/personal-profile-queries";

export function EmailChangeForm() {
  const changeEmailMutation = useChangeEmailMutation();
  const [sent, setSent] = useState(false);

  const form = useForm({
    defaultValues: { email: "" },
    onSubmit: ({ value }) => {
      changeEmailMutation.mutate(value.email, {
        onSuccess: () => {
          setSent(true);
        },
      });
    },
  });

  const errorMessage = changeEmailMutation.error ? changeEmailMutation.error.message : null;

  return (
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
          onChange: ({ value }) => (value.trim() ? undefined : "New email is required"),
        }}
      >
        {field => (
          <FormField
            id="newEmail"
            label="New email address"
            type="email"
            value={field.state.value}
            onBlur={field.handleBlur}
            onChange={field.handleChange}
            disabled={changeEmailMutation.isPending}
            error={field.state.meta.errors[0]}
          />
        )}
      </form.Field>

      {errorMessage ? <FormErrorAlert message={errorMessage} /> : null}

      {sent ? (
        <p className="text-muted-foreground text-sm">
          A confirmation email is on its way. Follow its steps to finish the change.
        </p>
      ) : null}

      <form.Subscribe selector={state => [state.canSubmit, state.isSubmitting]}>
        {([canSubmit]) => (
          <Button
            type="submit"
            variant="outline"
            disabled={!canSubmit || changeEmailMutation.isPending}
          >
            {changeEmailMutation.isPending ? "Sending..." : "Change email"}
          </Button>
        )}
      </form.Subscribe>
    </form>
  );
}
