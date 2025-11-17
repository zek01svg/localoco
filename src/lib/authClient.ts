import { createAuthClient } from "better-auth/react";
import { url } from "../constants/url";

export const authClient = createAuthClient({
    baseURL: url!,
});
