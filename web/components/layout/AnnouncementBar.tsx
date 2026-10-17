"use client";
import { useSite } from "@/hooks/useSite";

export function AnnouncementBar() {
  const { site } = useSite();
  if (!site) return null;

  if (site.maintenance.on) {
    return (
      <div className="bg-danger px-4 py-2 text-center text-sm font-medium text-white" role="alert">
        {site.maintenance.message || "Maintenance in progress. Conversions are paused."}
      </div>
    );
  }
  if (site.announcement) {
    const content = site.announcement.link ? (
      <a href={site.announcement.link} className="underline underline-offset-2">
        {site.announcement.text}
      </a>
    ) : (
      site.announcement.text
    );
    return (
      <div className="bg-primary px-4 py-2 text-center text-sm font-medium text-primary-contrast">
        {content}
      </div>
    );
  }
  return null;
}
