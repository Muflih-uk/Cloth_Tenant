import { redirect } from "next/navigation";

export default async function LegacyBrandDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/admin/profile/settings/brands/${id}`);
}
