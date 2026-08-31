import { CardSkeleton, PageHeaderSkeleton } from "@/components/ui/Skeleton";

export default function PortalLoading() {
  return (
    <div className="max-w-6xl mx-auto px-4 md:px-6 py-5 md:py-8 space-y-6">
      <PageHeaderSkeleton />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
      </div>
    </div>
  );
}
