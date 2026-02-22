"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body>
        <div style={{ padding: "2rem", fontFamily: "sans-serif", maxWidth: 800 }}>
          <h1 style={{ color: "#c00" }}>Something went wrong</h1>
          <pre style={{ background: "#f5f5f5", padding: "1rem", overflow: "auto" }}>
            {error.message}
          </pre>
          <button type="button" onClick={() => reset()}>
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
