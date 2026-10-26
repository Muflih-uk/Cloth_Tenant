import type { ReactNode } from "react";

import Card from "@/components/ui/app/Card";

interface AnalyticsCardProps {
  title?: string;
  subtitle?: string;
  headerAction?: ReactNode;
  children: ReactNode;
  className?: string;
}

export default function AnalyticsCard({
  title,
  subtitle,
  headerAction,
  children,
  className = "",
}: AnalyticsCardProps) {
  return (
    <Card
      title={title}
      subtitle={subtitle}
      action={headerAction}
      className={className}
    >
      {children}
    </Card>
  );
}
