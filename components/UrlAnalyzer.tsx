"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { motion } from "framer-motion";

function normalizeUrl(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }
  return `https://${trimmed}`;
}

export default function UrlAnalyzer() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const normalized = normalizeUrl(url);
    if (!normalized) {
      setError("Please enter a website URL.");
      return;
    }
    try {
      new URL(normalized);
      const path = `/scan?url=${encodeURIComponent(normalized)}`;
      console.log("[scan-nav] router.push", path);
      router.push(path);
    } catch {
      setError("Please enter a valid URL (e.g. example.com).");
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-4 sm:flex-row sm:items-center"
      >
        <div className="flex-1">
          <input
            type="text"
            value={url}
            onChange={(e) => {
              setUrl(e.target.value);
              setError("");
            }}
            placeholder="https://your-website.com"
            className="h-12 w-full rounded-xl border border-[#1C1C1F] bg-[#070708] px-4 text-sm text-[color:#F2F2F7] placeholder:text-[color:#4A4A55] outline-none transition-colors focus:border-[rgba(0,229,255,0.6)]"
            aria-label="Website URL"
          />
        </div>
        <button
          type="submit"
          className="flex h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-[#00E5FF] px-6 text-sm font-semibold text-[#070708] transition-colors hover:bg-[#00b8cc]"
        >
          <Search className="h-4 w-4" />
          Analyze
        </button>
      </form>
      {error && (
        <p className="mt-3 text-sm text-[#EF4444]">{error}</p>
      )}
    </motion.div>
  );
}
