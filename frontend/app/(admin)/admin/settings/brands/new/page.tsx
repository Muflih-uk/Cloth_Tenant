import { redirect } from "next/navigation";

export default function LegacyNewBrandPage() {
  redirect("/admin/profile/settings/brands/new");
}
