import { redirect } from "next/navigation";

/**
 * Root page. Skeleton only: redirects to the login route.
 * Authentication-aware routing should replace this when business logic is added.
 */
export default function HomePage() {
  redirect("/login");
}
