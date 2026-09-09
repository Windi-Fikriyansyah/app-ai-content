import { redirect } from "next/navigation";

export default function BusinessProfilePage() {
  redirect("/settings?tab=business");
}
