"use client";

import { ChevronLeft, Save } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import OrderItem from "@/components/pages/admin/order-item/OrderItem";
import Button from "@/components/ui/app/Button";
import { PageLoading } from "@/components/ui/Loading";
import { orderApi } from "@/lib/api/order";
import type { OrderResponse } from "@/types/order";

export default function EditOrderPage() {
  const params = useParams();
  const id = params.id as string;
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<OrderResponse>();

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);

    const fetchData = async () => {
      try {
        const response = await orderApi.getOne(Number(id));
        setData(response);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  if (loading) return <PageLoading />;

  return (
    <div className="min-h-screen bg-app-bg pb-24">
      <header className="border-b border-app-line/70 bg-app-card/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3">
          <Link
            href={`/admin/order/status/${id}`}
            className="app-focus -ml-2 inline-flex size-11 shrink-0 items-center justify-center rounded-control text-app-muted transition-colors hover:bg-app-soft hover:text-app-ink"
            aria-label="Back to order"
          >
            <ChevronLeft className="size-5" aria-hidden="true" />
          </Link>
          <h1 className="min-w-0 flex-1 truncate text-xl font-extrabold text-app-ink">
            Edit Order
          </h1>
          <Button type="button" className="shrink-0">
            <Save className="size-4" aria-hidden="true" />
            Save
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-2xl space-y-4 px-4 py-4">
        <section>
          <h2 className="mb-3 text-sm font-bold text-app-ink">Ordered Items</h2>
          <div className="app-card overflow-hidden">
            <OrderItem items={data?.items} />
          </div>
        </section>
      </main>
    </div>
  );
}
