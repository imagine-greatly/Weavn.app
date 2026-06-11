export default function ScanLoading() {
  return (
    <div
      style={{
        minHeight: "100svh",
        background: "#050810",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 360,
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        <div className="page-skeleton-bar" style={{ width: "100%" }} />
        <div className="page-skeleton-bar" style={{ width: "88%" }} />
        <div className="page-skeleton-bar" style={{ width: "74%" }} />
      </div>
    </div>
  );
}
