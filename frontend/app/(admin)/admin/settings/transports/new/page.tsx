import { redirect } from "next/navigation";

export default function LegacyNewTransportPage() {
  redirect("/admin/profile/settings/transports/new");
}
