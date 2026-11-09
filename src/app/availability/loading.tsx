import { CarLoadingScreen } from "@/components/common/car-loading-screen";

export default function AvailabilityLoading() {
  return (
    <CarLoadingScreen
      fullScreen={true}
      message="Checking live calendar availability..."
      subtext="Looking up real-time fleet schedules and rates"
    />
  );
}
