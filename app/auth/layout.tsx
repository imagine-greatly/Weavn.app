import type { Metadata } from "next";
import { Suspense } from "react";
import PageLoadSkeleton from "@/components/PageLoadSkeleton";

export const metadata: Metadata = {
  title: "Sign in — webdoc",
  description: "Sign in to your webdoc account to access your conversion audit reports.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<PageLoadSkeleton bars={4} maxWidth={360} />}>{children}</Suspense>
  );
}
