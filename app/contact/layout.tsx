import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact",
  description: "Reach the WebDoc team for diagnostic issues, product feedback, or results.",
};

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return children;
}
