import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Shared report",
  description: "Shared diagnostic report link.",
};

export default function ShareTokenLayout({ children }: { children: React.ReactNode }) {
  return children;
}
