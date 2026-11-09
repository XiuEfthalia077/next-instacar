import { CarLoadingScreen } from "@/components/common/car-loading-screen";

export default function BookingsOnlineLoading() {
  return (
    <CarLoadingScreen
      fullScreen={false}
      message="Loading online reservations..."
      subtext="Syncing pending, approved, and active bookings"
    />
  );
}
