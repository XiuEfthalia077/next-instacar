import { CarLoadingScreen } from "@/components/common/car-loading-screen";

export default function UserMyBookingsLoading() {
  return (
    <CarLoadingScreen
      fullScreen={false}
      message="Preparing your bookings..."
      subtext="Retrieving your reservation history and schedules"
    />
  );
}
