import { AdminPageSkeleton } from "@/components/ui/admin-page-skeleton";

export default function DashboardLoading() {
  return <AdminPageSkeleton titleWidth="w-56" showKpis={true} kpiCount={4} showToolbar={true} tableRows={6} />;
}
