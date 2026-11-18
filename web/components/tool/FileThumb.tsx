import { FileAudio, FileImage, FileVideo } from "lucide-react";
import type { Item } from "@/hooks/useConverter";
import { extOf } from "@/lib/format";

export function FileThumb({ item }: { item: Item }) {
  if (item.previewUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={item.previewUrl} alt="" className="size-12 shrink-0 rounded-lg border border-line bg-surface-2 object-cover" />;
  }
  const Icon = item.category === "audio" ? FileAudio : item.category === "video" ? FileVideo : FileImage;
  return (
    <div className="relative grid size-12 shrink-0 place-items-center rounded-lg border border-line bg-surface-2 text-muted">
      <Icon className="size-5" aria-hidden />
      <span className="absolute -bottom-1.5 rounded bg-primary px-1 text-[9px] font-bold uppercase text-primary-ink">{extOf(item.file.name).slice(0, 4)}</span>
    </div>
  );
}
