import { AdminPageSkeleton } from "@/components/ui/admin-page-skeleton";

export default function BookingsManualLoading() {
  return (
    <AdminPageSkeleton
      titleWidth="w-64"
      subtitleWidth="w-28"
      showTabs={true}
      tabCount={4}
      showKpis={true}
      kpiCount={4}
      showToolbar={true}
      tableRows={6}
    />
  );
}
