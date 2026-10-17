// Inline SVG icons — no emoji, no external icon packages.

interface IconProps {
  className?: string;
}

function base(className: string | undefined, path: React.ReactNode, filled = false) {
  return (
    <svg
      className={className ?? "h-4 w-4"}
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke={filled ? "none" : "currentColor"}
      strokeWidth={filled ? undefined : 2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {path}
    </svg>
  );
}

export const IconDashboard = (p: IconProps) =>
  base(
    p.className,
    <>
      <rect x="3" y="3" width="7" height="9" rx="1" />
      <rect x="14" y="3" width="7" height="5" rx="1" />
      <rect x="14" y="12" width="7" height="9" rx="1" />
      <rect x="3" y="16" width="7" height="5" rx="1" />
    </>
  );

export const IconLayers = (p: IconProps) =>
  base(
    p.className,
    <>
      <path d="M12 2 2 7l10 5 10-5-10-5z" />
      <path d="M2 17l10 5 10-5" />
      <path d="M2 12l10 5 10-5" />
    </>
  );

export const IconTag = (p: IconProps) =>
  base(
    p.className,
    <>
      <path d="M20.59 13.41 11 3H4v7l9.59 9.59a2 2 0 0 0 2.82 0l4.18-4.18a2 2 0 0 0 0-2.82z" />
      <circle cx="7.5" cy="7.5" r="1.5" />
    </>
  );

export const IconUsers = (p: IconProps) =>
  base(
    p.className,
    <>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </>
  );

export const IconShield = (p: IconProps) =>
  base(
    p.className,
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  );

export const IconActivity = (p: IconProps) =>
  base(
    p.className,
    <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
  );

export const IconMegaphone = (p: IconProps) =>
  base(
    p.className,
    <path d="M3 11l18-7-7 18-2.5-7.5L3 11z" />
  );

export const IconChart = (p: IconProps) =>
  base(
    p.className,
    <>
      <path d="M18 20V10" />
      <path d="M12 20V4" />
      <path d="M6 20v-6" />
    </>
  );

export const IconSettings = (p: IconProps) =>
  base(
    p.className,
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </>
  );

export const IconLogout = (p: IconProps) =>
  base(
    p.className,
    <>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="M16 17l5-5-5-5" />
      <path d="M21 12H9" />
    </>
  );

export const IconAlert = (p: IconProps) =>
  base(
    p.className,
    <>
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </>
  );

export const IconCheck = (p: IconProps) =>
  base(p.className, <path d="M20 6L9 17l-5-5" />);

export const IconSpinner = (p: IconProps) =>
  base(
    p.className,
    <path d="M21 12a9 9 0 1 1-6.22-8.56" />
  );

export const IconSearch = (p: IconProps) =>
  base(
    p.className,
    <>
      <circle cx="11" cy="11" r="8" />
      <path d="M21 21l-4.35-4.35" />
    </>
  );

export const IconPlus = (p: IconProps) =>
  base(
    p.className,
    <>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </>
  );

export const IconTrash = (p: IconProps) =>
  base(
    p.className,
    <>
      <path d="M3 6h18" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </>
  );

export const IconEdit = (p: IconProps) =>
  base(
    p.className,
    <>
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </>
  );

export const IconBolt = (p: IconProps) =>
  base(
    p.className,
    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
  );

export const IconClock = (p: IconProps) =>
  base(
    p.className,
    <>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v6l4 2" />
    </>
  );

export const IconDot = (p: IconProps) =>
  base(p.className, <circle cx="12" cy="12" r="6" />, true);

export const IconChevronDown = (p: IconProps) =>
  base(p.className, <path d="M6 9l6 6 6-6" />);

export const TABS_META: { id: string; label: string; icon: (p: IconProps) => React.ReactNode }[] = [
  { id: "dashboard", label: "Dashboard", icon: IconDashboard },
  { id: "formats", label: "Formats", icon: IconLayers },
  { id: "plans", label: "Plans & Messages", icon: IconTag },
  { id: "users", label: "Users", icon: IconUsers },
  { id: "team", label: "Team", icon: IconShield },
  { id: "jobs", label: "Jobs", icon: IconActivity },
  { id: "ads", label: "Ads", icon: IconMegaphone },
  { id: "reports", label: "Reports", icon: IconChart },
  { id: "settings", label: "Settings", icon: IconSettings },
];
