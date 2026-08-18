import type { EmailChange, ProfileUpdate } from "#shared/contracts/profiles";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiUrl } from "#client/lib/api";
import { errorEnvelopeSchema } from "#shared/contracts/error";
import { emailChangeResponseSchema, privateProfileSchema } from "#shared/contracts/profiles";

async function errorMessage(res: Response, fallback: string): Promise<string> {
  const envelope = errorEnvelopeSchema.safeParse(await res.json());
  return envelope.success ? envelope.data.error.message : fallback;
}

export function usePersonalProfileQuery(enabled: boolean) {
  return useQuery({
    queryKey: ["personal-profile"],
    queryFn: async () => {
      const res = await fetch(`${apiUrl}/profile`);
      if (!res.ok) {
        throw new Error("Your profile could not be loaded. Try again shortly.");
      }
      return privateProfileSchema.parse(await res.json());
    },
    enabled,
    retry: false,
  });
}

export function useUpdateProfileMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: ProfileUpdate) => {
      const res = await fetch(`${apiUrl}/profile`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        throw new Error(
          await errorMessage(res, "Your profile could not be updated. Try again shortly.")
        );
      }
      return privateProfileSchema.parse(await res.json());
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["personal-profile"] });
    },
  });
}

export function useChangeEmailMutation() {
  return useMutation({
    mutationFn: async (email: string) => {
      const res = await fetch(`${apiUrl}/profile/email-change`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email } satisfies EmailChange),
      });
      if (!res.ok) {
        throw new Error(
          await errorMessage(res, "The email change could not be requested. Try again shortly.")
        );
      }
      return emailChangeResponseSchema.parse(await res.json());
    },
  });
}
