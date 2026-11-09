import { CarLoadingScreen } from "@/components/common/car-loading-screen";

export default function AdminLoading() {
  return (
    <CarLoadingScreen
      fullScreen={false}
      message="Preparing admin console..."
      subtext="Loading fleet controls and permissions"
    />
  );
}
