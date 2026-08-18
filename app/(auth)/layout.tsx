/**
 * Auth route group layout.
 * Groups authentication-related pages (login, register, forgot password, etc.)
 * under a shared wrapper without affecting the URL.
 */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-muted px-4">
      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
}
