import { useEffect, useMemo, useState } from "react";

export default function TotalSavedHero({
  total,
  programCount,
  monthsTracked,
}: {
  total: number;
  programCount: number;
  monthsTracked: number;
}) {
  const [displayValue, setDisplayValue] = useState(0);
  const [counting, setCounting] = useState(false);

  const formatted = useMemo(() => `$${displayValue.toLocaleString()}`, [displayValue]);

  useEffect(() => {
    const duration = 1500;
    const start = performance.now();
    let raf = 0;
    setCounting(true);
    const animate = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(Math.floor(eased * Math.max(0, total)));
      if (progress < 1) {
        raf = requestAnimationFrame(animate);
      } else {
        setCounting(false);
      }
    };
    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, [total]);

  return (
    <div className="bb-total-hero">
      <div style={{ textAlign: "center" }}>
        <div className="bb-total-hero-kicker">TOTAL BENEFITS RECEIVED</div>
        <div className={`bb-total-hero-amount ${counting ? "bb-total-hero-shimmer" : ""}`}>
          <span className="bb-total-hero-amount-text">{formatted}</span>
        </div>
        <div className="bb-total-hero-sub">
          across {programCount} program{programCount === 1 ? "" : "s"} · {monthsTracked} month{monthsTracked === 1 ? "" : "s"}
        </div>
      </div>
    </div>
  );
}

