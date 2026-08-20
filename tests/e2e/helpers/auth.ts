import type { Page } from "@playwright/test";

import { eq } from "drizzle-orm";

import { user } from "#server/database/auth";
import { db } from "#server/lib/db";

export interface TestUserCredentials {
  name: string;
  email: string;
  password: string;
}

export function generateTestUser(): TestUserCredentials {
  const uniqueId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  return {
    name: `Test User ${uniqueId}`,
    email: `e2e-${uniqueId}@example.com`,
    password: "Password123!",
  };
}

export function getRandomTestIp(): string {
  const b = Math.floor(Math.random() * 250) + 1;
  const c = Math.floor(Math.random() * 250) + 1;
  return `10.100.${b}.${c}`;
}

export async function createAndLoginUser(page: Page): Promise<TestUserCredentials> {
  const credentials = generateTestUser();

  const response = await page.request.post("/api/auth/sign-up/email", {
    data: {
      name: credentials.name,
      email: credentials.email,
      password: credentials.password,
    },
    headers: {
      origin: "http://localhost:4001",
      "x-forwarded-for": getRandomTestIp(),
    },
  });

  if (!response.ok()) {
    const errorText = await response.text();
    throw new Error(`Failed to create and log in test user: ${errorText}`);
  }

  // Navigate to root to ensure client-side session queries pick up the new session cookie
  await page.goto("/");
  return credentials;
}

export async function createVerifiedUser(page: Page): Promise<TestUserCredentials> {
  const credentials = await createAndLoginUser(page);

  await db.update(user).set({ emailVerified: true }).where(eq(user.email, credentials.email));

  await page.goto("/");
  return credentials;
}
