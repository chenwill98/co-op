import { ListingsGridSkeleton } from '@/app/ui/skeletons';

export default function Loading() {
  return (
    <main className="z-0 relative">
      <div className="container mx-auto w-5/7">
        <div className="flex flex-row w-full">
          <div className="grow pb-24">
            <ListingsGridSkeleton />
          </div>
        </div>
      </div>
    </main>
  );
}