import { AdminPageSkeleton } from "@/components/ui/admin-page-skeleton";

export default function StaffLoading() {
  return (
    <AdminPageSkeleton
      titleWidth="w-64"
      subtitleWidth="w-28"
      showTabs={false}
      showKpis={true}
      kpiCount={4}
      showToolbar={true}
      tableRows={7}
    />
  );
}
