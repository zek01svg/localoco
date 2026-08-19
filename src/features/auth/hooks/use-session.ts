import { auth } from "#client/lib/auth";

export function useSession() {
  const sessionResult = auth.useSession();
  const session = sessionResult.data?.session ?? null;
  const user = sessionResult.data?.user ?? null;

  return {
    session,
    user,
    data: sessionResult.data,
    isPending: sessionResult.isPending,
    error: sessionResult.error,
    isAuthenticated: Boolean(session && user),
    isVerified: Boolean(user?.emailVerified),
    signOut: async () => {
      await auth.signOut();
    },
    refetch: sessionResult.refetch,
  };
}
