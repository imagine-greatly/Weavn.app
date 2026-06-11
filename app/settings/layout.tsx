import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Settings",
  description: "Account, subscription, and notification settings.",
};

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
