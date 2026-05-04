"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function AnalyzeRedirect() {
  const router = useRouter();
  const params = useSearchParams();
  useEffect(() => {
    const url = params.get("url");
    if (url) {
      const path = `/scan?url=${encodeURIComponent(url)}`;
      console.log("[scan-nav] router.replace (from /analyze)", path);
      router.replace(path);
            } else {
      router.replace("/");
    }
  }, [router, params]);
  return null;
}

export default function AnalyzePage() {
  return (
    <Suspense fallback={null}>
      <AnalyzeRedirect />
    </Suspense>
  );
}
