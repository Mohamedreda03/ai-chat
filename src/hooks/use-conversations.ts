"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export interface Conversation {
  id: string;
  title: string;
  updatedAt: string;
}

export const CONVERSATIONS_KEY = ["conversations"] as const;

async function fetchConversations(): Promise<Conversation[]> {
  const res = await fetch("/api/conversations");
  if (!res.ok) throw new Error("Failed to fetch conversations");
  return res.json() as Promise<Conversation[]>;
}

export function useConversations() {
  return useQuery({
    queryKey: CONVERSATIONS_KEY,
    queryFn: fetchConversations,
    refetchInterval: 5000, // poll every 5s so title updates appear automatically
  });
}

export function useDeleteConversation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/conversations/${id}`, { method: "DELETE" }).then((r) => {
        if (!r.ok) throw new Error("Failed to delete");
      }),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: CONVERSATIONS_KEY });
      const previous =
        queryClient.getQueryData<Conversation[]>(CONVERSATIONS_KEY);
      queryClient.setQueryData<Conversation[]>(CONVERSATIONS_KEY, (old) =>
        old ? old.filter((c) => c.id !== id) : [],
      );
      return { previous };
    },
    onError: (_err, _id, context) => {
      if (context?.previous) {
        queryClient.setQueryData(CONVERSATIONS_KEY, context.previous);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: CONVERSATIONS_KEY });
    },
  });
}

export function useDeleteAllConversations() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      fetch("/api/conversations", { method: "DELETE" }).then((r) => {
        if (!r.ok) throw new Error("Failed to delete all");
      }),
    onSuccess: () => {
      queryClient.setQueryData(CONVERSATIONS_KEY, []);
    },
  });
}
