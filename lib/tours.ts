/**
 * lib/tours.ts — Server-only data access layer for the Virtual Tours feature.
 *
 * All functions run exclusively on the server and interact with the Supabase `tours` table.
 */

import { getSupabaseClient } from "@/lib/supabase";
import type { Tour, TourInsert, TourUpdate } from "@/types";
import type { TablesInsert, TablesUpdate } from "@/types/supabase";

export class ToursError extends Error {
  constructor(
    message: string,
    public readonly status?: number
  ) {
    super(message);
    this.name = "ToursError";
  }
}

/**
 * Standard iframe code generator for Immersio tours.
 */
export function generateDefaultIframe(slug: string): string {
  const cleanSlug = slug.trim().toLowerCase();
  return `<iframe src="https://immersio.ma/visite/${cleanSlug}" width="100%" height="100%" frameborder="0" scrolling="no"></iframe>`;
}

/**
 * Fetch all virtual tours from Supabase.
 */
export async function getTours(): Promise<Tour[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("tours")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    throw new ToursError(`Supabase error: ${error.message}`);
  }

  // Soft-delete : filtré en JS pour fonctionner avant comme après la
  // migration SQL créant la colonne `archived`.
  return ((data || []) as Tour[]).filter((t) => !t.archived);
}

/**
 * Fetch a single tour by ID.
 */
export async function getTourById(id: string): Promise<Tour | null> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("tours")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null; // Not found
    throw new ToursError(`Supabase error: ${error.message}`);
  }

  return data as Tour;
}

/**
 * Fetch every published tour — the public site's list read path.
 *
 * Filters on `active` in the query rather than in JS so an unpublished
 * tour never reaches the caller in the first place.
 */
export async function getActiveTours(): Promise<Tour[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("tours")
    .select("*")
    .eq("active", true)
    .order("created_at", { ascending: false });

  if (error) {
    throw new ToursError(`Supabase error: ${error.message}`);
  }

  // Un tour archivé n'est jamais servi au site, même resté `active`.
  return ((data || []) as Tour[]).filter((t) => !t.archived);
}

/**
 * Fetch a single published tour by slug — the public site's page read path.
 *
 * `maybeSingle` (not `single`) because a missing slug is an ordinary 404
 * here, not an error worth throwing on. The `active` filter is part of the
 * query for the same reason as above: the public endpoint must not be able
 * to leak an unpublished tour.
 */
export async function getTourBySlug(slug: string): Promise<Tour | null> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("tours")
    .select("*")
    .eq("slug", slug.trim().toLowerCase())
    .eq("active", true)
    .maybeSingle();

  if (error) {
    throw new ToursError(`Supabase error: ${error.message}`);
  }

  const tour = (data as Tour) ?? null;
  // Un tour archivé est un 404 public, même resté `active`.
  return tour && !tour.archived ? tour : null;
}

/**
 * Create a new virtual tour.
 */
export async function createTour(tourData: TourInsert): Promise<Tour> {
  const supabase = getSupabaseClient();

  const slug = tourData.slug.trim().toLowerCase();
  if (!slug) {
    throw new ToursError("Le slug est obligatoire.", 400);
  }
  if (!tourData.property_name?.trim()) {
    throw new ToursError("Le nom du bien / projet est obligatoire.", 400);
  }

  // Auto-generate iframe if not provided
  const iframe = tourData.iframe?.trim() || generateDefaultIframe(slug);

  const payload: TablesInsert<"tours"> = {
    slug,
    property_name: tourData.property_name.trim(),
    client_name: tourData.client_name?.trim() || null,
    sector: tourData.sector?.trim().toLowerCase() || null,
    realsee_url: tourData.realsee_url?.trim() || null,
    active: tourData.active !== undefined ? tourData.active : true,
    iframe,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("tours")
    .insert(payload)
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      throw new ToursError(`Un tour avec le slug "${slug}" existe déjà.`, 409);
    }
    throw new ToursError(`Supabase error: ${error.message}`);
  }

  return data as Tour;
}

/**
 * Update an existing virtual tour.
 */
export async function updateTour(id: string, tourData: TourUpdate): Promise<Tour> {
  const supabase = getSupabaseClient();

  const payload: TablesUpdate<"tours"> = {
    updated_at: new Date().toISOString(),
  };

  if (tourData.slug !== undefined) {
    const slug = tourData.slug.trim().toLowerCase();
    if (!slug) throw new ToursError("Le slug ne peut pas être vide.", 400);
    payload.slug = slug;
  }
  if (tourData.property_name !== undefined) {
    const name = tourData.property_name.trim();
    if (!name) throw new ToursError("Le nom ne peut pas être vide.", 400);
    payload.property_name = name;
  }
  if (tourData.client_name !== undefined) {
    payload.client_name = tourData.client_name?.trim() || null;
  }
  if (tourData.sector !== undefined) {
    payload.sector = tourData.sector?.trim().toLowerCase() || null;
  }
  if (tourData.realsee_url !== undefined) {
    payload.realsee_url = tourData.realsee_url?.trim() || null;
  }
  if (tourData.active !== undefined) {
    payload.active = tourData.active;
  }
  if (tourData.iframe !== undefined) {
    payload.iframe = tourData.iframe?.trim() || null;
  }

  const { data, error } = await supabase
    .from("tours")
    .update(payload)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      throw new ToursError(`Un tour avec le slug "${payload.slug}" existe déjà.`, 409);
    }
    throw new ToursError(`Supabase error: ${error.message}`);
  }

  return data as Tour;
}

/**
 * Archive un tour (soft-delete) : conservé en base, retiré du dashboard et
 * du site. Décision du 29/08/2026 : « supprimer » = archiver.
 */
export async function archiveTour(id: string): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from("tours")
    .update({ archived: true, updated_at: new Date().toISOString() } as any)
    .eq("id", id);

  if (error) {
    throw new ToursError(`Supabase error: ${error.message}`);
  }
}
