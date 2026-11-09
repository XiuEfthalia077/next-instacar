import { CarLoadingScreen } from "@/components/common/car-loading-screen";

export default function BookingDetailsLoading() {
  return (
    <CarLoadingScreen
      fullScreen={false}
      message="Loading booking details..."
      subtext="Retrieving contract, payments, and vehicle schedule"
    />
  );
}
