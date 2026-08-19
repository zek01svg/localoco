import type {
  CreateEvent,
  EventAuditsResponse,
  EventItem,
  EventsResponse,
  UpdateEvent,
} from "#shared/contracts/events";

import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiUrl } from "#client/lib/api";
import { errorEnvelopeSchema } from "#shared/contracts/error";
import {
  eventAuditsResponseSchema,
  eventItemSchema,
  eventsResponseSchema,
} from "#shared/contracts/events";

async function parseErrorMessage(res: Response, fallback: string): Promise<string> {
  try {
    const json: unknown = await res.json();
    const parsed = errorEnvelopeSchema.safeParse(json);
    return parsed.success ? parsed.data.error.message : fallback;
  } catch {
    return fallback;
  }
}

export class EventNotFoundError extends Error {
  constructor(message = "This event is no longer available.") {
    super(message);
    this.name = "EventNotFoundError";
  }
}

export function usePublicEventsQuery() {
  return useInfiniteQuery<EventsResponse>({
    queryKey: ["public-events"],
    queryFn: async ({ pageParam }) => {
      const url = new URL(`${apiUrl}/events`);
      url.searchParams.set("limit", "10");
      if (typeof pageParam === "string" && pageParam) {
        url.searchParams.set("cursor", pageParam);
      }

      const res = await fetch(url.toString(), { credentials: "include" });
      if (!res.ok) {
        throw new Error("Could not load events");
      }
      return eventsResponseSchema.parse(await res.json());
    },
    initialPageParam: null as string | null,
    getNextPageParam: lastPage => lastPage.nextCursor ?? undefined,
  });
}

export function useBusinessEventsQuery(businessId: string, enabled = true) {
  return useQuery<EventsResponse>({
    queryKey: ["business-events", businessId],
    queryFn: async () => {
      const res = await fetch(`${apiUrl}/businesses/${businessId}/events?limit=50`, {
        credentials: "include",
      });
      if (!res.ok) {
        throw new Error("Could not load business events");
      }
      return eventsResponseSchema.parse(await res.json());
    },
    enabled: Boolean(businessId) && enabled,
  });
}

export function useEventDetailQuery(eventId: string, enabled = true) {
  return useQuery<EventItem>({
    queryKey: ["event", eventId],
    queryFn: async () => {
      const res = await fetch(`${apiUrl}/events/${eventId}`, {
        credentials: "include",
      });
      if (res.status === 404) {
        throw new EventNotFoundError(`Event ${eventId} not found`);
      }
      if (!res.ok) {
        const message = await parseErrorMessage(res, "Could not load event");
        throw new Error(message);
      }
      return eventItemSchema.parse(await res.json());
    },
    enabled: enabled && Boolean(eventId),
  });
}

export function useCreateEventMutation(businessId: string) {
  const queryClient = useQueryClient();

  return useMutation<EventItem, Error, CreateEvent>({
    mutationFn: async payload => {
      const res = await fetch(`${apiUrl}/businesses/${businessId}/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const message = await parseErrorMessage(res, "Failed to create event");
        throw new Error(message);
      }

      return eventItemSchema.parse(await res.json());
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["business-events", businessId] });
      void queryClient.invalidateQueries({ queryKey: ["public-events"] });
    },
  });
}

export function useUpdateEventMutation(businessId: string, eventId: string) {
  const queryClient = useQueryClient();

  return useMutation<EventItem, Error, UpdateEvent>({
    mutationFn: async payload => {
      const res = await fetch(`${apiUrl}/businesses/${businessId}/events/${eventId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const message = await parseErrorMessage(res, "Failed to update event");
        throw new Error(message);
      }

      return eventItemSchema.parse(await res.json());
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["business-events", businessId] });
      void queryClient.invalidateQueries({ queryKey: ["event", eventId] });
      void queryClient.invalidateQueries({ queryKey: ["public-events"] });
    },
  });
}

export function useDeleteEventMutation(businessId: string) {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: async eventId => {
      const res = await fetch(`${apiUrl}/businesses/${businessId}/events/${eventId}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!res.ok) {
        const message = await parseErrorMessage(res, "Failed to delete event");
        throw new Error(message);
      }
    },
    onSuccess: (_, eventId) => {
      void queryClient.invalidateQueries({ queryKey: ["business-events", businessId] });
      void queryClient.invalidateQueries({ queryKey: ["public-events"] });
      queryClient.removeQueries({ queryKey: ["event", eventId] });
    },
  });
}

export function useModerateEventMutation(eventId: string) {
  const queryClient = useQueryClient();

  return useMutation<EventItem, Error, { action: "moderate" | "restore"; reason: string }>({
    mutationFn: async payload => {
      const res = await fetch(`${apiUrl}/events/${eventId}/moderate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const message = await parseErrorMessage(res, "Failed to moderate event");
        throw new Error(message);
      }

      return eventItemSchema.parse(await res.json());
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["event", eventId] });
      void queryClient.invalidateQueries({ queryKey: ["public-events"] });
      void queryClient.invalidateQueries({ queryKey: ["business-events"] });
    },
  });
}

export function useEventAuditsQuery(eventId: string, enabled = true) {
  return useQuery<EventAuditsResponse>({
    queryKey: ["event-audits", eventId],
    queryFn: async () => {
      const res = await fetch(`${apiUrl}/events/${eventId}/audits`, {
        credentials: "include",
      });
      if (!res.ok) {
        throw new Error("Could not load event audits");
      }
      return eventAuditsResponseSchema.parse(await res.json());
    },
    enabled: Boolean(eventId) && enabled,
  });
}
