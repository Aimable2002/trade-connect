export function PlaceholderBanner({ text }: { text: string }) {
  return (
    <div className="rounded-md border border-warning/30 bg-warning/5 px-3 py-2 text-[11px] text-warning">
      {text}
    </div>
  );
}
