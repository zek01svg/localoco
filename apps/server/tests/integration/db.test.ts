import { eq } from "drizzle-orm";
import { describe, it, expect, beforeAll, afterAll } from "vitest";

import { user } from "../../database/schema";
import { setupTestDatabase, teardownTestDatabase } from "../setup";

describe("Database Integration Tests (Testcontainers)", () => {
  let db: any;
  let container: any;

  beforeAll(async () => {
    const setup = await setupTestDatabase();
    db = setup.db;
    container = setup.pgContainer;
  }, 60000); // Increase timeout for container startup

  afterAll(async () => {
    await teardownTestDatabase();
  });

  it("should successfully connect to the test container", () => {
    expect(db).toBeDefined();
    expect(container).toBeDefined();
  });

  it("should be able to insert and query a user", async () => {
    const newUser = {
      id: "test-user-1",
      name: "Test User",
      email: "test@example.com",
      emailVerified: true,
    };

    await db.insert(user).values(newUser);

    const result = await db
      .select()
      .from(user)
      .where(eq(user.id, "test-user-1"));
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Test User");
  });

  it("should maintain data integrity across operations", async () => {
    const users = await db.select().from(user);
    const initialCount = users.length;

    await db.insert(user).values({
      id: "test-user-2",
      name: "Another User",
      email: "another@example.com",
      emailVerified: true,
    });

    const updatedUsers = await db.select().from(user);
    expect(updatedUsers.length).toBe(initialCount + 1);
  });
});
