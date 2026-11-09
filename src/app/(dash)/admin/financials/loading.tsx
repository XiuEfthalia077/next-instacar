import { CarLoadingScreen } from "@/components/common/car-loading-screen";

export default function FinancialsLoading() {
  return (
    <CarLoadingScreen
      fullScreen={false}
      message="Loading financial records..."
      subtext="Aggregating revenue, payments, and payouts"
    />
  );
}
