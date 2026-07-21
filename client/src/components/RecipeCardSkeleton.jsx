import Skeleton from './Skeleton'
export default function RecipeCardSkeleton() {
  return (
    <div className="liquid-glass flex h-full flex-col overflow-hidden rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.25)]">
      <Skeleton className="aspect-16/10 w-full rounded-none" />
      <div className="relative flex-1 space-y-2 bg-(--recipe-card-bg-light) p-3 dark:bg-(--recipe-card-bg-dark)">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
        <div className="flex gap-1 pt-1">
          <Skeleton className="h-4 w-12 rounded-full" />
          <Skeleton className="h-4 w-14 rounded-full" />
        </div>
      </div>
    </div>
  )
}
