import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Diagnostic scan",
  description: "Live scan progress for your domain diagnostic.",
};

export default function ScanLayout({ children }: { children: React.ReactNode }) {
  return children;
}
