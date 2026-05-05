export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const url = searchParams.get("url");
    if (!url) return Response.json({ reachable: false });

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    try {
      const res = await fetch(url, {
        method: "HEAD",
        signal: controller.signal,
        redirect: "follow",
      });
      clearTimeout(timer);
      if (res.status < 500) return Response.json({ reachable: true });
      return Response.json({ reachable: false });
    } catch {
      clearTimeout(timer);
      return Response.json({ reachable: false });
    }
  } catch {
    return Response.json({ reachable: false });
  }
}
