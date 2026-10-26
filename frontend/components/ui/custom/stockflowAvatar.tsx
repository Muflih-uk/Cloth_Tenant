import { Admin } from "@/types/admin";
import { AgentUser } from "@/types/agent";
import { AuthUser } from "@/types/auth";
import { SimpleAgent, SimpleCustomer } from "@/types/order";
import { User } from "lucide-react";
import { useSyncExternalStore } from "react";

import { cn } from "@/lib/utils";

interface StockflowAvatarProps {
  user?: AuthUser | SimpleAgent | SimpleCustomer | AgentUser | Admin | null;
  tone?: "green" | "purple" | "navy" | "soft";
  size?: "sm" | "md" | "lg";
  className?: string;
}

function useIsClient() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

const toneClasses = {
  green: "bg-brand-green text-white",
  purple: "bg-brand-purple text-white",
  navy: "bg-brand-navy text-white",
  soft: "bg-app-soft text-app-ink",
};

const sizeClasses = {
  sm: "size-9 text-xs",
  md: "size-11 text-sm",
  lg: "size-14 text-base",
};

const StockflowAvatar: React.FC<StockflowAvatarProps> = ({
  user,
  tone = "green",
  size = "md",
  className,
}) => {
  const isClient = useIsClient();

  const username =
    (user && "display_name" in user && user.display_name) ||
    (user && "username" in user && user.username) ||
    (user && "name" in user && user.name) ||
    "";

  const safeUsername = username?.trim() || "";

  if (!user || !isClient) {
    return (
      <div
        className={cn(
          "flex shrink-0 items-center justify-center rounded-full border border-app-line bg-app-soft text-app-muted shadow-card",
          sizeClasses[size],
          className,
        )}
      >
        <User className="size-[45%]" aria-hidden="true" />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full border border-white/60 font-bold shadow-card",
        toneClasses[tone],
        sizeClasses[size],
        className,
      )}
      aria-hidden="true"
    >
      {safeUsername.length > 0 ? (
        <span>{safeUsername[0].toUpperCase()}</span>
      ) : (
        <User className="size-[45%]" />
      )}
    </div>
  );
};

export default StockflowAvatar;
