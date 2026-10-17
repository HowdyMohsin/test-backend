import { Button } from "@/components/ui/Button";

export interface ActionBarProps {
  total: number;
  ready: number;
  doneCount: number;
  busy: boolean;
  zipping: boolean;
  namePattern: string;
  onNamePatternChange: (pattern: string) => void;
  onConvert: () => void;
  onAddMore: () => void;
  onClear: () => void;
  onCancel: () => void;
  onDownloadAll: () => void;
}

/** Convert All / Add more / Clear / Cancel / Download ZIP / name pattern. */
export function ActionBar({
  total,
  ready,
  doneCount,
  busy,
  zipping,
  namePattern,
  onNamePatternChange,
  onConvert,
  onAddMore,
  onClear,
  onCancel,
  onDownloadAll,
}: ActionBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-surface p-3">
      <Button onClick={onConvert} disabled={busy || ready === 0} className="min-w-[9rem]">
        {busy ? "Converting…" : `Convert all (${ready})`}
      </Button>
      {busy ? (
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
      ) : (
        <>
          <Button variant="secondary" onClick={onAddMore}>
            Add more
          </Button>
          <Button variant="ghost" onClick={onClear} disabled={total === 0}>
            Clear all
          </Button>
        </>
      )}
      <div className="ml-auto flex items-center gap-2">
        <label className="text-xs text-text-muted" htmlFor="name-pattern">
          File names
        </label>
        <select
          id="name-pattern"
          value={namePattern}
          onChange={(event) => onNamePatternChange(event.target.value)}
          className="rounded-lg border border-border bg-surface px-2 py-1.5 text-xs text-text"
        >
          <option value="original">Original name</option>
          <option value="converted">name-converted</option>
        </select>
        <Button variant="secondary" onClick={onDownloadAll} disabled={zipping || doneCount < 2}>
          {zipping ? "Making ZIP…" : `Download all (.zip)`}
        </Button>
      </div>
    </div>
  );
}
