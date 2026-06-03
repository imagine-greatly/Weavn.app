import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Quick Start",
  description: "Get started with the WebDoc API in 5 minutes. Authentication, your first request, and response parsing.",
};

export default function DocsApiLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
