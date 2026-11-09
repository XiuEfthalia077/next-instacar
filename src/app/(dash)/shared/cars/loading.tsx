import { CarLoadingScreen } from "@/components/common/car-loading-screen";

export default function SharedCarsLoading() {
  return (
    <CarLoadingScreen
      fullScreen={false}
      message="Loading fleet management..."
      subtext="Preparing vehicle inventory and maintenance status"
    />
  );
}
