import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "POST /api/v1/scan",
  description: "Full reference for the Weavn scan endpoint. Request parameters, response schema, error codes.",
};

export default function DocsScanLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
