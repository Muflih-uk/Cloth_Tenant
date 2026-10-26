import { redirect } from "next/navigation";

export default async function LegacyEditTransportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/admin/profile/settings/transports/${id}/edit`);
}
