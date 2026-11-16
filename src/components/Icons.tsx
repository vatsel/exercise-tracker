import type { SVGProps } from "react";

// Every icon in the app lives here. SVGs are copied from https://lucide.dev (see AGENTS.md).

type IconProps = SVGProps<SVGSVGElement>;

function Icon({ children, ...props }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

export function CopyIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
      <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
    </Icon>
  );
}

export function CircleXIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="10" />
      <path d="m15 9-6 6" />
      <path d="m9 9 6 6" />
    </Icon>
  );
}

export function CirclePlusIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="10" />
      <path d="M8 12h8" />
      <path d="M12 8v8" />
    </Icon>
  );
}

export function CircleCheckIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="10" />
      <path d="m9 12 2 2 4-4" />
    </Icon>
  );
}

// Lucide has no circled skip-forward, so this is its skip-forward scaled to 0.4 about the centre to sit inside
// circle-x's circle. The coordinates are scaled rather than transformed so the stroke keeps its width.
export function CircleSkipForwardIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="10" />
      <path d="M15.6 8.8v6.4" />
      <path d="M9.612 8.914A0.8 0.8 0 0 0 8.4 9.6v4.8a0.8 0.8 0 0 0 1.212 0.686l3.999-2.399a0.8 0.8 0 0 0 .001-1.373z" />
    </Icon>
  );
}
