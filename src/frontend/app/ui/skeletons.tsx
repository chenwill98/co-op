/**
 * Skeleton for individual listing cards
 * Matches ListingsCard structure: aspect-[3/2] image, auto-height content, rounded-2xl
 */
export function ListingsCardSkeleton() {
  return (
    <div className="rounded-2xl border border-base-300/50 bg-base-100/90 shadow-[0_4px_24px_rgba(0,0,0,0.06)]">
      {/* Image area - 3:2 aspect ratio */}
      <div className="skeleton aspect-[3/2] rounded-none rounded-t-2xl" />

      {/* Card body */}
      <div className="p-3 flex flex-col gap-2">
        {/* Neighborhood + Address */}
        <div className="flex flex-col gap-1">
          <div className="skeleton h-3 w-32 rounded" />
          <div className="skeleton h-5 w-48 rounded" />
          <div className="skeleton h-3 w-36 rounded" />
        </div>

        {/* Price section */}
        <div className="flex items-center gap-2">
          <div className="skeleton h-6 w-28 rounded" />
          <div className="skeleton h-5 w-16 rounded-full" />
        </div>

        {/* Tags section - pushed to bottom */}
        <div className="flex mt-auto gap-1">
          <div className="skeleton h-5 w-16 rounded-full" />
          <div className="skeleton h-5 w-20 rounded-full" />
          <div className="skeleton h-5 w-14 rounded-full" />
        </div>
      </div>
    </div>
  );
}

/**
 * Full grid skeleton matching actual listings layout
 * Uses gap-3, 6 card skeletons in a 3-column grid
 */
export function ListingsGridSkeleton() {
  return (
    <div className="grid grid-cols-3 gap-3 p-4 w-full">
      <ListingsCardSkeleton />
      <ListingsCardSkeleton />
      <ListingsCardSkeleton />
      <ListingsCardSkeleton />
      <ListingsCardSkeleton />
      <ListingsCardSkeleton />
    </div>
  );
}

/**
 * Skeleton for property detail page
 * Matches /listings/[id]/page.tsx: container w-4/5, breadcrumbs, 5-column grid
 */
export function PropertyDetailSkeleton() {
  return (
    <div className="container mx-auto px-4 py-8 w-full lg:w-4/5">
      {/* Two-column grid */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 lg:gap-6">
        {/* Left: Carousel + Description + Amenities */}
        <div className="flex flex-col col-span-1 lg:col-span-3 gap-4">
          <div className="glass-panel p-4 md:p-5">
            {/* Breadcrumbs + Actions */}
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2">
                <div className="skeleton h-6 w-20 rounded-full" />
                <div className="skeleton h-6 w-24 rounded-full" />
                <div className="skeleton h-4 w-32 rounded" />
              </div>
              <div className="flex gap-3">
                <div className="skeleton h-10 w-10 rounded-full" />
                <div className="skeleton h-10 w-28 rounded-full" />
              </div>
            </div>
            <div className="skeleton h-[400px] rounded-xl" />
          </div>
          <div className="glass-panel p-4 md:p-5">
            <div className="skeleton h-6 w-32 rounded mb-3" />
            <div className="skeleton h-4 w-full rounded mb-2" />
            <div className="skeleton h-4 w-5/6 rounded mb-2" />
            <div className="skeleton h-4 w-4/6 rounded" />
          </div>
          <div className="glass-panel p-4 md:p-5">
            <div className="skeleton h-6 w-24 rounded mb-3" />
            <div className="flex flex-wrap gap-2">
              <div className="skeleton h-8 w-24 rounded-lg" />
              <div className="skeleton h-8 w-20 rounded-lg" />
              <div className="skeleton h-8 w-28 rounded-lg" />
            </div>
          </div>
        </div>

        {/* Right: Details panels */}
        <div className="flex flex-col col-span-1 lg:col-span-2 gap-4">
          {/* Title */}
          <div className="glass-panel p-4 md:p-5">
            <div className="skeleton h-8 w-48 rounded mb-2" />
            <div className="skeleton h-5 w-32 rounded" />
          </div>
          {/* Price */}
          <div className="glass-panel p-4 md:p-5">
            <div className="skeleton h-10 w-36 rounded mb-2" />
            <div className="skeleton h-4 w-48 rounded" />
          </div>
          {/* Transportation */}
          <div className="glass-panel p-4 md:p-5">
            <div className="skeleton h-6 w-28 rounded mb-3" />
            <div className="skeleton h-4 w-full rounded mb-2" />
            <div className="skeleton h-4 w-3/4 rounded" />
          </div>
          {/* Location */}
          <div className="glass-panel p-4 md:p-5">
            <div className="skeleton h-6 w-20 rounded mb-3" />
            <div className="skeleton h-4 w-full rounded mb-2" />
            <div className="skeleton h-4 w-2/3 rounded" />
          </div>
        </div>
      </div>
    </div>
  );
}

// Legacy skeleton kept for backwards compatibility
export function CardSkeleton() {
  return (
    <div className="rounded-xl bg-base-200 p-2 shadow-xs">
      <div className="flex p-4">
        <div className="skeleton h-5 w-5 rounded-md" />
        <div className="skeleton ml-2 h-6 w-16 rounded-md text-sm font-medium" />
      </div>
      <div className="flex items-center justify-center truncate rounded-xl bg-base-100 px-4 py-8">
        <div className="skeleton h-7 w-20 rounded-md" />
      </div>
    </div>
  );
}

export default function DashboardSkeleton() {
  return (
    <>
      <div className="skeleton mb-4 h-8 w-36 rounded-md" />
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
      </div>
    </>
  );
}
