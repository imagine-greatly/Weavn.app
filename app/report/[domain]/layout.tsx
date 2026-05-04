import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Diagnostic report",
  description: "Scan report for a tracked domain.",
};

export default function ReportDomainLayout({ children }: { children: React.ReactNode }) {
  return children;
}
