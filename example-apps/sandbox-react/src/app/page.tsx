"use client";

import dynamic from "next/dynamic";

const SandboxApp = dynamic(() => import("@/components/SandboxApp"), { ssr: false });

export default function Page() {
  return <SandboxApp />;
}
