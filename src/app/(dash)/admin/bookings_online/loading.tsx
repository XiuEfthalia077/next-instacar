import { AdminPageSkeleton } from "@/components/ui/admin-page-skeleton";

export default function BookingsOnlineLoading() {
  return (
    <AdminPageSkeleton
      titleWidth="w-56"
      subtitleWidth="w-32"
      showTabs={true}
      tabCount={6}
      showKpis={true}
      kpiCount={4}
      showToolbar={true}
      tableRows={6}
    />
  );
}
