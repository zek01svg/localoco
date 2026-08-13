import { createAuthClient } from "better-auth/react";
import { url } from "../constants/url";

const baseURL = url;
export const authClient = createAuthClient({
    baseURL: baseURL
});