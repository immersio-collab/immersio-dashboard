import type { Metadata } from "next";
import { getAllPosts } from "@/lib/blog";
import { BlogTable } from "@/components/blog";

export const metadata: Metadata = {
  title: "Blog — Immersio Dashboard",
};

export const dynamic = "force-dynamic";

/**
 * Blog Page — Server Component.
 * Loads every post, drafts included, and hands them to the interactive table.
 */
export default async function BlogPage() {
  const posts = await getAllPosts();

  return (
    <div className="flex flex-col flex-1 min-h-0 space-y-4">
      <BlogTable initialPosts={posts} />
    </div>
  );
}
