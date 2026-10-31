import { redirect } from "next/navigation";

export default function AdminFleetSchedulesRedirect() {
  redirect("/shared/my_car_schedules");
}
