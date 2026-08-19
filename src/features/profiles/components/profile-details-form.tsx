import type { ProfileUpdate } from "#shared/contracts/profiles";

import { useForm } from "@tanstack/react-form";

import { Button } from "#client/components/ui/button";
import { FormErrorAlert, FormField } from "#client/features/auth";

import { useUpdateProfileMutation } from "../hooks/personal-profile-queries";

export function ProfileDetailsForm({
  displayName,
  avatarUrl,
}: {
  displayName: string;
  avatarUrl: string | null;
}) {
  const updateProfileMutation = useUpdateProfileMutation();

  const form = useForm({
    defaultValues: {
      displayName,
      avatarUrl: avatarUrl ?? "",
    },
    onSubmit: ({ value }) => {
      const input: ProfileUpdate = {
        displayName: value.displayName,
        ...(value.avatarUrl.trim() ? { avatarUrl: value.avatarUrl.trim() } : { avatarUrl: null }),
      };
      updateProfileMutation.mutate(input);
    },
  });

  const errorMessage = updateProfileMutation.error ? updateProfileMutation.error.message : null;

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
        name="displayName"
        validators={{
          onChange: ({ value }) =>
            value.trim().length === 0 ? "Display name is required" : undefined,
        }}
      >
        {field => (
          <FormField
            id="displayName"
            label="Display name"
            type="text"
            value={field.state.value}
            onBlur={field.handleBlur}
            onChange={field.handleChange}
            disabled={updateProfileMutation.isPending}
            error={field.state.meta.errors[0]}
          />
        )}
      </form.Field>

      <form.Field name="avatarUrl">
        {field => (
          <FormField
            id="avatarUrl"
            label="Avatar image URL"
            type="url"
            required={false}
            value={field.state.value}
            onBlur={field.handleBlur}
            onChange={field.handleChange}
            disabled={updateProfileMutation.isPending}
          />
        )}
      </form.Field>

      {errorMessage ? <FormErrorAlert message={errorMessage} /> : null}

      <form.Subscribe selector={state => [state.canSubmit, state.isSubmitting]}>
        {([canSubmit]) => (
          <Button type="submit" disabled={!canSubmit || updateProfileMutation.isPending}>
            {updateProfileMutation.isPending ? "Saving..." : "Save changes"}
          </Button>
        )}
      </form.Subscribe>
    </form>
  );
}
