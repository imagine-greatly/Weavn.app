import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Your diagnostic reports, scores, and resolutions.",
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return children;
}
