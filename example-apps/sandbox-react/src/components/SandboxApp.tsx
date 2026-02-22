"use client";

import React from "react";
import { WalletProvider } from "@/context/WalletContext";
import App from "@/components/AppContent";

if (typeof window !== "undefined") {
  (window as unknown as { localStorage: Storage }).localStorage.debug = "*";

  window.addEventListener("unhandledrejection", (e) => {
    if (
      e.reason instanceof Error &&
      e.reason.message.includes("has not been authorized yet")
    ) {
      e.preventDefault();
    }
  });
}

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("ErrorBoundary caught:", error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: "2rem", fontFamily: "sans-serif", maxWidth: 800 }}>
          <h1 style={{ color: "#c00" }}>Something went wrong</h1>
          <pre style={{ background: "#f5f5f5", padding: "1rem", overflow: "auto" }}>
            {this.state.error.message}
          </pre>
          <pre style={{ fontSize: 12, color: "#666" }}>
            {this.state.error.stack}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function SandboxApp() {
  return (
    <ErrorBoundary>
      <WalletProvider>
        <App />
      </WalletProvider>
    </ErrorBoundary>
  );
}
