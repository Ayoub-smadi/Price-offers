import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { ProductCategory, InsertProductCategory } from "@shared/schema";

export function useCategories() {
  return useQuery<ProductCategory[]>({
    queryKey: ["/api/product-categories"],
  });
}

export function useCreateCategory() {
  return useMutation({
    mutationFn: (data: InsertProductCategory) =>
      apiRequest("POST", "/api/product-categories", data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/product-categories"] }),
  });
}

export function useUpdateCategory() {
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<InsertProductCategory> & { id: number }) =>
      apiRequest("PUT", `/api/product-categories/${id}`, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/product-categories"] }),
  });
}

export function useDeleteCategory() {
  return useMutation({
    mutationFn: (id: number) =>
      apiRequest("DELETE", `/api/product-categories/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/product-categories"] }),
  });
}
