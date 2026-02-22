"use client";
import React, { useRef, useEffect } from "react";
import { useWallet } from "@/context/WalletContext";

export function SectionEventLog() {
  const { eventLog } = useWallet();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [eventLog.length]);

  return (
    <div className="event-log">
      {eventLog.map((entry, i) => (
        <div key={i} className="event-entry">
          {entry}
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  );
}
