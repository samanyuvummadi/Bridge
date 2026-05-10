import type { SVGAttributes } from "react";

type IconProps = SVGAttributes<SVGSVGElement> & { size?: number };

const base = ({ size = 24, className, ...rest }: IconProps) => ({
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "none",
  xmlns: "http://www.w3.org/2000/svg",
  className: className ? `bb-svg-icon ${className}` : "bb-svg-icon",
  ...rest,
});

export function IconSearch(props: IconProps) {
  const p = base(props);
  return (
    <svg {...p} aria-hidden="true">
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
      <path d="m20 20-3.8-3.8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

/** Wallet-style card holder for “My Benefits”. */
export function IconBenefitsWallet(props: IconProps) {
  const p = base(props);
  return (
    <svg {...p} aria-hidden="true">
      <rect x="2" y="4" width="20" height="15" rx="2" stroke="currentColor" strokeWidth="2" />
      <rect x="4" y="7" width="16" height="10" rx="1" stroke="currentColor" strokeWidth="2" opacity="0.45" />
      <path d="M6 16h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.55" />
    </svg>
  );
}

/** Small sprouting plant — empty-state “growth” motif. */
export function IconSprout(props: IconProps) {
  const p = base(props);
  return (
    <svg {...p} aria-hidden="true">
      <path
        d="M12 20v-6M12 14c2-5 10-8 10-3 0 3-6 7-10 9M12 14C10 9 2 7 2 11c0 3 7 7 10 9"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M8 21h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.45" />
    </svg>
  );
}

/** App logo mark (sprout) */
export function IconLogo(props: IconProps) {
  const p = base({ ...props, size: props.size ?? 26 });
  return (
    <svg {...p} aria-hidden="true">
      <path
        d="M12 19c0-4.5 3.6-8.8 9-10-1.1 5.1-4.6 8.8-9 10z"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <path
        d="M12 19c0-4.5-3.6-8.8-9-10 1.1 5.1 4.6 8.8 9 10z"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <path
        d="M12 19v2"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <path
        d="M7.5 21h9"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function IconClipboard(props: IconProps) {
  const p = base(props);
  return (
    <svg {...p} aria-hidden="true">
      <rect x="8" y="2" width="8" height="4" rx="1" stroke="currentColor" strokeWidth="2" />
      <path d="M6 8h12v13a2 2 0 01-2 2H8a2 2 0 01-2-2V8z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M9 13h6M9 17h6" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}

export function IconBell(props: IconProps) {
  const p = base(props);
  return (
    <svg {...p} aria-hidden="true">
      <path
        d="M12 3a5 5 0 015 5v3.5c0 1 .5 2 1.5 3H5.5c1-1 1.5-2 1.5-3V8a5 5 0 015-5z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M9 20h6M10 21h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function IconMic(props: IconProps) {
  const p = base(props);
  return (
    <svg {...p} aria-hidden="true">
      <rect x="9" y="3" width="6" height="11" rx="3" stroke="currentColor" strokeWidth="2" />
      <path d="M6 11a6 6 0 0012 0M12 19v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M9 21h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function IconStopFilled(props: IconProps) {
  const p = base(props);
  return (
    <svg {...p} aria-hidden="true">
      <rect x="7" y="7" width="10" height="10" rx="1.5" fill="currentColor" />
    </svg>
  );
}

export function IconSparkle(props: IconProps) {
  const p = base(props);
  return (
    <svg {...p} aria-hidden="true">
      <path
        d="M12 2l1.2 3.9L17 6l-3.8 1.4L12 11l-1.2-3.6L7 6l3.8-1.1L12 2zM12 14l.7 2.1L15 17l-2.3.8L12 20l-.7-2.2L9 17l2.3-.9L12 14z"
        fill="currentColor"
        opacity="0.9"
      />
    </svg>
  );
}

export function IconTimelineDot(props: IconProps) {
  const p = base(props);
  return (
    <svg {...p} aria-hidden="true">
      <circle cx="12" cy="12" r="4" fill="currentColor" />
    </svg>
  );
}

export function IconChevronDown(props: IconProps) {
  const p = base(props);
  return (
    <svg {...p} aria-hidden="true">
      <path
        d="M6 9l6 6 6-6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function IconPhone(props: IconProps) {
  const p = base(props);
  return (
    <svg {...p} aria-hidden="true">
      <path
        d="M7.5 3.5h2.2c.6 0 1.1.4 1.2 1l.6 2.6c.1.5-.1 1-.5 1.3l-1.5 1.1c1.1 2 2.8 3.7 4.8 4.8l1.1-1.5c.3-.4.8-.6 1.3-.5l2.6.6c.6.1 1 .6 1 1.2v2.2c0 .7-.6 1.3-1.3 1.3C12 19.4 4.6 12 4.2 4.8c0-.7.6-1.3 1.3-1.3z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}
