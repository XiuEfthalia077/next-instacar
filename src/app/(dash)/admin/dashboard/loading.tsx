import { CarLoadingScreen } from "@/components/common/car-loading-screen";

export default function AdminDashboardLoading() {
  return (
    <CarLoadingScreen
      fullScreen={false}
      message="Revving up your dashboard..."
      subtext="Calculating fleet performance & analytics"
    />
  );
}
