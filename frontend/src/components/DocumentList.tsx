import { useState } from "react";

interface Props {
  documents: string[];
  title: string;
  progressLabel: (gathered: number, total: number) => string;
}

export default function DocumentList({ documents, title, progressLabel }: Props) {
  const [checked, setChecked] = useState<Record<number, boolean>>({});

  const toggle = (i: number) =>
    setChecked((c) => ({ ...c, [i]: !c[i] }));

  const gathered = Object.values(checked).filter(Boolean).length;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
        <h3 style={{ margin: 0 }}>{title}</h3>
        <span style={{ fontSize: "0.85rem", color: "var(--bb-text-soft)" }}>
          {progressLabel(gathered, documents.length)}
        </span>
      </div>
      {documents.map((doc, i) => (
        <label
          key={i}
          className={`bb-doc-item ${checked[i] ? "bb-doc-checked" : ""}`}
        >
          <input
            type="checkbox"
            checked={!!checked[i]}
            onChange={() => toggle(i)}
          />
          <span className="bb-doc-label">{doc}</span>
        </label>
      ))}
    </div>
  );
}
