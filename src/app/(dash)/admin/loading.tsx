import { AdminPageSkeleton } from "@/components/ui/admin-page-skeleton";

export default function AdminLoading() {
  return <AdminPageSkeleton titleWidth="w-52" showKpis={true} kpiCount={4} showToolbar={true} tableRows={6} />;
}
