import { useQuery } from "@tanstack/react-query";

import { apiUrl } from "#client/lib/api";
import { publicProfileSchema } from "#shared/contracts/profiles";

export class ProfileNotFoundError extends Error {
  constructor() {
    super("This profile does not exist.");
    this.name = "ProfileNotFoundError";
  }
}

export function usePublicProfileQuery(userId: string) {
  return useQuery({
    queryKey: ["users", userId, "public-profile"],
    queryFn: async () => {
      const res = await fetch(`${apiUrl}/users/${encodeURIComponent(userId)}`);

      // The only 404 this endpoint can answer is not_found; every other
      // failure (rate limit, dependency) is a generic load error.
      if (res.status === 404) {
        throw new ProfileNotFoundError();
      }
      if (!res.ok) {
        throw new Error("This profile could not be loaded. Try again shortly.");
      }

      return publicProfileSchema.parse(await res.json());
    },
    retry: false,
  });
}
