"use client";

import type { TopAgentsEntry } from "@/types/dashboard";
import RankedBarList from "@/components/ui/app/RankedBarList";

interface AgentHorizontalBarChartProps {
  agents: TopAgentsEntry[];
}

export default function AgentHorizontalBarChart({
  agents,
}: AgentHorizontalBarChartProps) {
  return (
    <RankedBarList
      title="Top agents"
      items={agents.map((agent) => ({
        id: agent.id,
        name: agent.username,
        metres: agent.metres,
      }))}
    />
  );
}
