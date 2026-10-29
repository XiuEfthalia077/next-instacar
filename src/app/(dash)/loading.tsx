import { CarLoadingScreen } from "@/components/common/car-loading-screen";

export default function DashboardLoading() {
  return (
    <CarLoadingScreen
      fullScreen={false}
      message="Loading dashboard view..."
      subtext="Syncing fleet metrics and live schedules"
      className="my-8 min-h-[460px]"
    />
  );
}
