export function Skeleton({ className }: { className?: string }) {
  return (
    <div className={`animate-pulse bg-zinc-800 rounded ${className || "h-4 w-full"}`} />
  );
}

export function FileTreeSkeleton() {
  return (
    <div className="p-2 space-y-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} className={`h-5 ${i % 3 === 0 ? "w-3/4" : i % 3 === 1 ? "w-1/2" : "w-2/3"}`} />
      ))}
    </div>
  );
}

export function PreviewSkeleton() {
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 mx-auto mb-3 rounded-full border-2 border-violet-600 border-t-transparent animate-spin" />
        <p className="text-xs text-zinc-500">Starting preview server...</p>
      </div>
    </div>
  );
}
