"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Info, Plus, ShieldCheck } from "lucide-react";

import StockflowAvatar from "@/components/ui/custom/stockflowAvatar";
import StockFlowButton from "@/components/ui/custom/stockFlowButton";
import { PageLoading } from "@/components/ui/Loading";
import { adminApi } from "@/lib/api/admin";
import { AdminAllResponse } from "@/types/admin";

/**
 * Settings › Sub admins.
 *
 * The same accounts the Users screen lists, reached from where a superuser goes
 * to configure the system. Creating and editing happen on the existing admin
 * forms, so this is only the picker: who else can sign in as an admin, and a way
 * into each of their accounts.
 */
export default function SubAdminsList() {
    const [data, setData] = useState<AdminAllResponse>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        let live = true;
        adminApi
            .getAll()
            .then((rows) => {
                if (live) setData(rows);
            })
            .catch((error) => {
                console.error("Error fetching admins:", error);
            })
            .finally(() => {
                if (live) setLoading(false);
            });
        return () => {
            live = false;
        };
    }, []);

    if (loading) {
        return <PageLoading />;
    }

    return (
        <div>
            <div className="flex w-full justify-end px-0 mb-3 sm:px-4 sm:mb-4">
                <StockFlowButton
                    text="Add Sub Admin"
                    variant="filled"
                    icon={<Plus className="size-4" />}
                    onClick={() => router.push("/admin/users/admins/new")}
                    className="shadow-lg shadow-primary/20 ring-1 ring-primary/10"
                />
            </div>

            {data.length === 0 ? (
                <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4 px-0 sm:px-4">
                    <ShieldCheck size={48} className="text-gray-300" />
                    <h2 className="text-xl font-bold text-gray-400">
                        No Sub Admins
                    </h2>
                </div>
            ) : (
                <div className="px-0 space-y-2 pb-20 sm:px-4 sm:space-y-3">
                    {data.map((admin) => (
                        <div
                            key={admin.id}
                            onClick={() =>
                                router.push(`/admin/users/admins/${admin.id}/`)
                            }
                            className="flex items-center gap-3 bg-white border border-gray-100 p-3 sm:gap-4 sm:p-4 hover:border-primary/30 hover:shadow-md transition-all rounded-2xl group cursor-pointer active:scale-[0.98]"
                        >
                            <StockflowAvatar user={admin} />

                            <div className="flex-1 min-w-0 px-2">
                                <h6 className="font-bold text-gray-900 text-base truncate leading-tight">
                                    {admin.display_name || admin.username}
                                </h6>
                                <p className="text-xs text-gray-400 truncate mt-1 leading-tight font-medium">
                                    {admin.email}
                                </p>
                            </div>

                            <div className="text-gray-200 group-hover:text-primary/30 transition-colors pl-2">
                                <Info size={18} />
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
