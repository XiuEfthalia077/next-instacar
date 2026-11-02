import { AdminPageSkeleton } from "@/components/ui/admin-page-skeleton";

export default function FinancialsLoading() {
  return (
    <AdminPageSkeleton
      titleWidth="w-72"
      subtitleWidth="w-32"
      showTabs={true}
      tabCount={4}
      showKpis={true}
      kpiCount={4}
      showToolbar={true}
      tableRows={6}
    />
  );
}
