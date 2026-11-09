import { CarLoadingScreen } from "@/components/common/car-loading-screen";

export default function BookingsManualLoading() {
  return (
    <CarLoadingScreen
      fullScreen={false}
      message="Loading walk-in bookings..."
      subtext="Fetching offline contracts & rental logs"
    />
  );
}
