import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Finding",
  description: "Diagnostic finding detail, evidence, and resolutions.",
};

export default function FindingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
