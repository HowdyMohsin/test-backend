export function ColorInput({ value, onChange, label }: { value: string; onChange: (value: string) => void; label: string }) {
  return (
    <input
      type="color"
      aria-label={label}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="h-9 w-14 cursor-pointer rounded border border-border bg-surface p-1"
    />
  );
}
