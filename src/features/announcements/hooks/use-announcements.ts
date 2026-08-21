import type {
  AnnouncementAuditsResponse,
  AnnouncementItem,
  AnnouncementsResponse,
  CreateAnnouncement,
  UpdateAnnouncement,
} from "#shared/contracts/announcements";

import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiUrl } from "#client/lib/api";
import {
  announcementAuditsResponseSchema,
  announcementItemSchema,
  announcementsResponseSchema,
} from "#shared/contracts/announcements";
import { errorEnvelopeSchema } from "#shared/contracts/error";

async function parseErrorMessage(res: Response, fallback: string): Promise<string> {
  try {
    const json: unknown = await res.json();
    const parsed = errorEnvelopeSchema.safeParse(json);
    return parsed.success ? parsed.data.error.message : fallback;
  } catch {
    return fallback;
  }
}

export class AnnouncementNotFoundError extends Error {
  constructor() {
    super("This announcement is no longer available.");
    this.name = "AnnouncementNotFoundError";
  }
}

export function usePublicAnnouncementsQuery() {
  return useInfiniteQuery<AnnouncementsResponse>({
    queryKey: ["public-announcements"],
    queryFn: async ({ pageParam }) => {
      const url = new URL(`${apiUrl}/announcements`);
      url.searchParams.set("limit", "10");
      if (typeof pageParam === "string" && pageParam) {
        url.searchParams.set("cursor", pageParam);
      }

      const res = await fetch(url.toString(), { credentials: "include" });
      if (!res.ok) {
        throw new Error("Could not load announcements");
      }
      return announcementsResponseSchema.parse(await res.json());
    },
    initialPageParam: null as string | null,
    getNextPageParam: lastPage => lastPage.nextCursor ?? undefined,
  });
}

export function useBusinessAnnouncementsQuery(businessId: string, enabled = true) {
  return useQuery<AnnouncementsResponse>({
    queryKey: ["business-announcements", businessId],
    queryFn: async () => {
      const res = await fetch(`${apiUrl}/businesses/${businessId}/announcements?limit=50`, {
        credentials: "include",
      });
      if (!res.ok) {
        throw new Error("Could not load business announcements");
      }
      return announcementsResponseSchema.parse(await res.json());
    },
    enabled: Boolean(businessId) && enabled,
  });
}

export function useAnnouncementDetailQuery(announcementId: string, enabled = true) {
  return useQuery<AnnouncementItem>({
    queryKey: ["announcement", announcementId],
    queryFn: async () => {
      const res = await fetch(`${apiUrl}/announcements/${announcementId}`, {
        credentials: "include",
      });
      if (res.status === 404) {
        throw new AnnouncementNotFoundError();
      }
      if (!res.ok) {
        throw new Error("Could not load announcement");
      }
      return announcementItemSchema.parse(await res.json());
    },
    enabled: Boolean(announcementId) && enabled,
  });
}

export function useCreateAnnouncementMutation(businessId: string) {
  const queryClient = useQueryClient();

  return useMutation<AnnouncementItem, Error, CreateAnnouncement>({
    mutationFn: async payload => {
      const res = await fetch(`${apiUrl}/businesses/${businessId}/announcements`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const message = await parseErrorMessage(res, "Failed to create announcement");
        throw new Error(message);
      }

      return announcementItemSchema.parse(await res.json());
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["business-announcements", businessId] });
      void queryClient.invalidateQueries({ queryKey: ["public-announcements"] });
    },
  });
}

export function useUpdateAnnouncementMutation(businessId: string, announcementId: string) {
  const queryClient = useQueryClient();

  return useMutation<AnnouncementItem, Error, UpdateAnnouncement>({
    mutationFn: async payload => {
      const res = await fetch(
        `${apiUrl}/businesses/${businessId}/announcements/${announcementId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(payload),
        }
      );

      if (!res.ok) {
        const message = await parseErrorMessage(res, "Failed to update announcement");
        throw new Error(message);
      }

      return announcementItemSchema.parse(await res.json());
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["business-announcements", businessId] });
      void queryClient.invalidateQueries({ queryKey: ["announcement", announcementId] });
      void queryClient.invalidateQueries({ queryKey: ["public-announcements"] });
    },
  });
}

export function useDeleteAnnouncementMutation(businessId: string) {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: async announcementId => {
      const res = await fetch(
        `${apiUrl}/businesses/${businessId}/announcements/${announcementId}`,
        {
          method: "DELETE",
          credentials: "include",
        }
      );

      if (!res.ok) {
        const message = await parseErrorMessage(res, "Failed to delete announcement");
        throw new Error(message);
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["business-announcements", businessId] });
      void queryClient.invalidateQueries({ queryKey: ["public-announcements"] });
    },
  });
}

export function useModerateAnnouncementMutation(announcementId: string) {
  const queryClient = useQueryClient();

  return useMutation<AnnouncementItem, Error, { action: "moderate" | "restore"; reason: string }>({
    mutationFn: async payload => {
      const res = await fetch(`${apiUrl}/announcements/${announcementId}/moderate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const message = await parseErrorMessage(res, "Failed to moderate announcement");
        throw new Error(message);
      }

      return announcementItemSchema.parse(await res.json());
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["announcement", announcementId] });
      void queryClient.invalidateQueries({ queryKey: ["public-announcements"] });
    },
  });
}

export function useAnnouncementAuditsQuery(announcementId: string, enabled = true) {
  return useQuery<AnnouncementAuditsResponse>({
    queryKey: ["announcement-audits", announcementId],
    queryFn: async () => {
      const res = await fetch(`${apiUrl}/announcements/${announcementId}/audits`, {
        credentials: "include",
      });
      if (!res.ok) {
        throw new Error("Could not load announcement audits");
      }
      return announcementAuditsResponseSchema.parse(await res.json());
    },
    enabled: Boolean(announcementId) && enabled,
  });
}
