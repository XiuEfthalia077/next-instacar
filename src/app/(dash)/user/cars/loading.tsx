import { CarLoadingScreen } from "@/components/common/car-loading-screen";

export default function UserCarsLoading() {
  return (
    <CarLoadingScreen
      fullScreen={false}
      message="Loading available fleet..."
      subtext="Filtering cars, transmissions, and rates"
    />
  );
}
