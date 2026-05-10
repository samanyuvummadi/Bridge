import type { ReactNode } from "react";

export default function SelectionCard({
  title,
  description,
  icon,
  selected,
  onSelect,
}: {
  title: string;
  description?: string;
  icon?: ReactNode;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      className={`bb-select-card ${selected ? "bb-select-card-selected" : ""}`}
      onClick={onSelect}
      aria-pressed={selected}
    >
      {icon && <div className="bb-select-card-icon">{icon}</div>}
      <div>
        <div className="bb-select-card-title">{title}</div>
        {description && <div className="bb-select-card-desc">{description}</div>}
      </div>
    </button>
  );
}

