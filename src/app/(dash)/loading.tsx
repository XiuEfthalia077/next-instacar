import { CarLoadingScreen } from "@/components/common/car-loading-screen";

export default function DashboardLoading() {
  return (
    <CarLoadingScreen
      fullScreen={false}
      message="Revving up your dashboard..."
      subtext="Preparing your vehicles and bookings overview"
    />
  );
}
