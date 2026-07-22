export function LoadingSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="px-5 space-y-3 animate-pulse" aria-label="Loading content" role="status">
      <div className="h-8 w-2/5 rounded-xl bg-muted-surface" />
      <div className="h-28 w-full rounded-[2rem] bg-muted-surface" />
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="h-16 w-full rounded-[1.5rem] bg-muted-surface" />
      ))}
    </div>
  );
}
