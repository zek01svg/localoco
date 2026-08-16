import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";

import { auth } from "#client/lib/auth";

export function useSignInMutation() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: async (credentials: { email: string; password: string }) => {
      const result = await auth.signIn.email(credentials);
      if (result.error) {
        throw new Error(result.error.message ?? "Invalid email or password. Please try again.");
      }
      return result.data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries();
      void navigate({ to: "/" });
    },
  });
}

export function useSignUpMutation() {
  return useMutation({
    mutationFn: async (data: { name: string; email: string; password: string }) => {
      const result = await auth.signUp.email({
        name: data.name,
        email: data.email,
        password: data.password,
        callbackURL: "/verify-email",
      });
      if (result.error) {
        throw new Error(result.error.message ?? "Registration failed. Please check your details.");
      }
      return result.data;
    },
  });
}

export function useVerifyEmailQuery(token?: string) {
  return useQuery({
    queryKey: ["auth", "verify-email", token],
    queryFn: async () => {
      if (!token) {
        throw new Error("No verification token was provided in the link.");
      }
      const result = await auth.verifyEmail({ query: { token } });
      if (result.error) {
        throw new Error(
          result.error.message ?? "This verification link is invalid or has expired."
        );
      }
      return result.data;
    },
    enabled: Boolean(token),
    retry: false,
  });
}
