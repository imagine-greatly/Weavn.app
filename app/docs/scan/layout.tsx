import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "POST /v1/scan",
  description: "Full reference for the WebDoc scan endpoint. Request parameters, response schema, error codes.",
};

export default function DocsScanLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
