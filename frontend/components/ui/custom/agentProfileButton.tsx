"use client";

import { useRouter } from "next/navigation";
import StockflowAvatar from "./stockflowAvatar";
import { useAuth } from "@/context/AuthContext";

const AgentProfileButton: React.FC = () => {
  const router = useRouter();
  const { user } = useAuth();

  return (
    <div className="relative flex w-full justify-end px-4 py-3 lg:mx-auto lg:max-w-7xl lg:px-6">
      <button
        type="button"
        onClick={() => router.push("/agent/profile")}
        aria-label="Open profile"
        title="View profile"
        className="app-focus -m-1 flex size-12 items-center justify-center rounded-full p-1 transition-colors hover:bg-app-soft"
      >
        <StockflowAvatar user={user} />
      </button>
    </div>
  );
};

export default AgentProfileButton;
