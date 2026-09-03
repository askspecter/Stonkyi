import type { SVGProps } from "react";

const base = (p: SVGProps<SVGSVGElement>) => ({
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  ...p,
});

export function Leaf(p: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(p)}>
      <path d="M11 20A7 7 0 0 1 4 13c0-6 8-9 16-9 0 8-3 16-9 16Z" />
      <path d="M9 17c1.5-4 4-6.5 8-8.5" />
    </svg>
  );
}

export function IconHire(p: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(p)}>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3.5 19a5.5 5.5 0 0 1 11 0" />
      <path d="M18 8v6M15 11h6" />
    </svg>
  );
}

export function IconEarn(p: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(p)}>
      <path d="M4 16l5-5 3 3 6-7" />
      <path d="M15 7h5v5" />
    </svg>
  );
}

export function IconCollect(p: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(p)}>
      <path d="M12 3l4 4-4 14-4-14 4-4Z" />
      <path d="M8 7h8" />
    </svg>
  );
}

export function IconFloor(p: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(p)}>
      <path d="M3 20h18" />
      <rect x="5" y="12" width="3" height="6" />
      <rect x="10.5" y="8" width="3" height="10" />
      <rect x="16" y="4" width="3" height="14" />
    </svg>
  );
}

export function XIcon(p: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...p}>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24h-6.657l-5.214-6.817-5.966 6.817H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231 5.45-6.231Zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77Z" />
    </svg>
  );
}

export function DiscordIcon(p: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(p)}>
      <path d="M7 8.5A11 11 0 0 1 12 7.5a11 11 0 0 1 5 1c2 3 2.5 6.5 2 9.5-1.2.9-2.5 1.4-3.8 1.7l-.8-1.4" />
      <path d="M7 8.5C5.2 11 4.8 14.5 5.3 18c1.2.9 2.5 1.4 3.8 1.7l.8-1.4" />
      <circle cx="9.5" cy="13" r="1" />
      <circle cx="14.5" cy="13" r="1" />
    </svg>
  );
}

export function TelegramIcon(p: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(p)}>
      <path d="M21 5L3 12l5 2 2 5 3-3 4 3 4-14Z" />
      <path d="M8 14l9-6" />
    </svg>
  );
}
