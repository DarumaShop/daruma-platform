import { apiClient } from "../../../shared/lib/api-client";
import { z } from "zod";

export interface Tag {
  slug: string;
  name: string;
  children?: Tag[];
}

export const createTagSchema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  slug: z.string().optional(),
  parentSlug: z.string().optional(),
});
export type CreateTagData = z.infer<typeof createTagSchema>;

export const updateTagSchema = z.object({
  name: z.string().optional(),
  slug: z.string().optional(),
  parentSlug: z.string().nullable().optional(),
});
export type UpdateTagData = z.infer<typeof updateTagSchema>;

export const tagsApi = {
  getTags: async () => {
    const res = await apiClient.get("/public/tags");
    return res.data as Tag[];
  },
  createTag: async (data: CreateTagData) => {
    const res = await apiClient.post("/admin/tags", data);
    return res.data;
  },
  updateTag: async ({ slug, data }: { slug: string, data: UpdateTagData }) => {
    const res = await apiClient.patch(`/admin/tags/${slug}`, data);
    return res.data;
  },
  deleteTag: async ({ slug, cascade }: { slug: string, cascade: boolean }) => {
    const res = await apiClient.delete(`/admin/tags/${slug}?cascade=${cascade}`);
    return res.data;
  },
  validateSlug: async (slug: string) => {
    const res = await apiClient.get(`/admin/tags/validate-slug/${slug}`);
    return res.data;
  },
  suggestSlug: async ({ name, ignoreSlug }: { name: string; ignoreSlug?: string }) => {
    const params = new URLSearchParams({ name });
    if (ignoreSlug) params.append('ignoreSlug', ignoreSlug);
    const res = await apiClient.get(`/admin/tags/suggest-slug?${params.toString()}`);
    return res.data as { slug: string };
  },
};
