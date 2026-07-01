import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "API Playground",
  description: "Try the Weavn API live. Paste any URL and get a real conversion audit back in 60–120 seconds.",
};

export default function PlaygroundLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
