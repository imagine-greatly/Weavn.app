import type { Metadata } from "next";
import { Suspense } from "react";
import PageLoadSkeleton from "@/components/PageLoadSkeleton";

export const metadata: Metadata = {
  title: "Sign In",
  description: "Sign in to WebDoc to run diagnostics and view reports.",
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<PageLoadSkeleton bars={4} maxWidth={360} />}>{children}</Suspense>
  );
}
