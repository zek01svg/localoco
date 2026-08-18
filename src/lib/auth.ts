import { createAuthClient } from "better-auth/react";

import { apiUrl } from "#client/lib/api";

export const auth = createAuthClient({
  baseURL: `${apiUrl}/auth`,
});
