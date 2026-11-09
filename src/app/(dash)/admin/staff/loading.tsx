import { CarLoadingScreen } from "@/components/common/car-loading-screen";

export default function StaffLoading() {
  return (
    <CarLoadingScreen
      fullScreen={false}
      message="Loading staff directory..."
      subtext="Retrieving admin and agent user accounts"
    />
  );
}
