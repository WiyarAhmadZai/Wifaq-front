import React from "react";

export function needsImmediateAttention(item = {}) {
  return Boolean(
    item.immediate_attention ||
    item.task_type === "urgent" ||
    item.meeting_type === "emergency" ||
    item.tag === "urgent"
  );
}

export default function ImmediateAttention({ item, className = "", compact = false }) {
  if (!needsImmediateAttention(item)) return null;

  return (
    <span
      role="status"
      title="Immediate attention"
      className={`inline-flex items-center gap-1 rounded-full border border-red-300 bg-red-50 font-bold text-red-700 ${compact ? "px-1.5 py-0.5 text-[9px]" : "px-2 py-1 text-[10px]"} ${className}`}
    >
      <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-red-600" />
      <span>Immediate attention</span>
    </span>
  );
}
