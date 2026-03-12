import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl, type QuotationInput, type ParseTextInput } from "@shared/routes";

export function useQuotations() {
  return useQuery({
    queryKey: [api.quotations.list.path],
    queryFn: async () => {
      const res = await fetch(api.quotations.list.path, { credentials: "include" });
      if (!res.ok) {
        throw new Error("Failed to fetch quotations");
      }
      return api.quotations.list.responses[200].parse(await res.json());
    },
  });
}

export function useQuotation(id: number) {
  return useQuery({
    queryKey: [api.quotations.get.path, id],
    queryFn: async () => {
      const url = buildUrl(api.quotations.get.path, { id });
      const res = await fetch(url, { credentials: "include" });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to fetch quotation");
      return api.quotations.get.responses[200].parse(await res.json());
    },
    enabled: !!id,
  });
}

export function useCreateQuotation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: QuotationInput) => {
      const res = await fetch(api.quotations.create.path, {
        method: api.quotations.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        const errorMessage = errorData.message || `خطأ: ${res.statusText}`;
        throw new Error(errorMessage);
      }
      return api.quotations.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.quotations.list.path] });
    },
  });
}

export function useUpdateQuotation(id: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: QuotationInput) => {
      const url = buildUrl('/api/quotations/:id', { id });
      const res = await fetch(url, {
        method: 'PUT',
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || `خطأ: ${res.statusText}`);
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.quotations.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.quotations.get.path, id] });
    },
  });
}

export function useDeleteQuotation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/quotations/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to delete quotation');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.quotations.list.path] });
    },
  });
}

export function useParseText() {
  return useMutation({
    mutationFn: async (data: ParseTextInput) => {
      const res = await fetch(api.parser.parseText.path, {
        method: api.parser.parseText.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) {
        throw new Error("Failed to parse text");
      }
      return api.parser.parseText.responses[200].parse(await res.json());
    },
  });
}

