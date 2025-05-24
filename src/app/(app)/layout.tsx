"use client";

import { AppShell } from "@/components/layout/AppShell";
import { useAuth } from "@/providers/AuthProvider";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Skeleton } from "@/components/ui/skeleton";

export default function AuthenticatedAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [user, loading, router]);

  if (loading || !user) {
    // Show a more complete app shell skeleton
    return (
      <div className="grid min-h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr]">
        <aside className="hidden border-r bg-muted/40 md:block">
          <div className="flex h-full max-h-screen flex-col gap-2">
            <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
              <Skeleton className="h-6 w-32" />
            </div>
            <div className="flex-1 overflow-auto py-4 px-2 lg:px-4 space-y-2">
              {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          </div>
        </aside>
        <div className="flex flex-col">
          <header className="flex h-14 items-center gap-4 border-b bg-muted/40 px-4 lg:h-[60px] lg:px-6">
            <Skeleton className="h-8 w-8 md:hidden" /> {/* Mobile menu trigger */}
            <div className="w-full flex-1" /> {/* Spacer */}
            <Skeleton className="h-8 w-8" /> {/* Theme toggle */}
            <Skeleton className="h-8 w-8" /> {/* Notifications */}
            <Skeleton className="h-8 w-8 rounded-full" /> {/* User avatar */}
          </header>
          <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">
            <Skeleton className="h-8 w-48 mb-4" />
            <Skeleton className="h-64 w-full" />
          </main>
        </div>
      </div>
    );
  }

  return <AppShell>{children}</AppShell>;
}
