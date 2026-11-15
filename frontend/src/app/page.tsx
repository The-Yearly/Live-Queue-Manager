"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";

export default function Home() {
  const { manager, loading } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (!loading) router.replace(manager ? "/queues" : "/login");
  }, [loading, manager, router]);
  return null;
}
