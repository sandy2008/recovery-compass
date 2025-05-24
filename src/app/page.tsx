"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/providers/AuthProvider";
import { Compass } from "lucide-react"; // Or your app logo/spinner

export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (user) {
        router.replace("/dashboard");
      } else {
        router.replace("/login");
      }
    }
  }, [user, loading, router]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background text-foreground">
      <Compass className="h-24 w-24 animate-spin text-primary mb-4" />
      <p className="text-xl">Loading Recovery Compass...</p>
    </div>
  );
}
