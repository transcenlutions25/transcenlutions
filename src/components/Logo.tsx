export function Logo({ size = 22 }: { size?: number }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span
        className="inline-block rounded-md gold-border bg-gradient-to-br from-gold/30 to-transparent"
        style={{ width: size, height: size }}
      />
      <span
        className="font-semibold tracking-tight"
        style={{ fontSize: size * 0.8 }}
      >
        Transcen<span className="text-gold">lutions</span>
      </span>
    </span>
  );
}
