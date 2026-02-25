import { ListingsGridSkeleton } from "@/app/ui/skeletons";

export default function Loading() {
  return (
    <div className="flex justify-center w-full page-gradient min-h-screen">
      <div className="container mx-auto w-full px-4 md:w-5/6 lg:w-5/7">
        <ListingsGridSkeleton />
      </div>
    </div>
  );
}
