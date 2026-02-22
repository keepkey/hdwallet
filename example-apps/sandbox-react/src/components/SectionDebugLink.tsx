"use client";
import React from "react";

type Props = {
  onYes: () => void;
  onNo: () => void;
  onCancel: () => void;
};

export function SectionDebugLink({ onYes, onNo, onCancel }: Props) {
  return (
    <div className="container">
      <h4>DebugLink</h4>
      <button type="button" onClick={onYes}>Yes</button>
      <button type="button" onClick={onNo}>No</button>
      <button type="button" onClick={onCancel}>Cancel</button>
    </div>
  );
}
