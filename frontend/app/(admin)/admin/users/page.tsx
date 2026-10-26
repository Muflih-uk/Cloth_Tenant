"use client";

import { useState } from "react";

import AdminsList from "@/components/pages/admin/users/AdminsList";
import AgentsList from "@/components/pages/admin/users/AgentsList";
import CustomerList from "@/components/pages/admin/users/CustomersList";
import PageHeader from "@/components/ui/app/PageHeader";
import SegmentedControl from "@/components/ui/app/SegmentedControl";
import { useAuth } from "@/context/AuthContext";

type Tab = "Customers" | "Agents" | "Admins";

export default function CustomersPage() {
  const { isSuperuser } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>(() => {
    if (typeof window !== "undefined") {
      return (
        (sessionStorage.getItem("adminUsersActiveTab") as Tab) || "Customers"
      );
    }
    return "Customers";
  });

  const usersTabs: Tab[] = isSuperuser
    ? ["Customers", "Agents", "Admins"]
    : ["Customers", "Agents"];
  const visibleTab = usersTabs.includes(activeTab) ? activeTab : "Customers";

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    sessionStorage.setItem("adminUsersActiveTab", tab);
  };

  return (
    <div className="mx-auto min-h-screen w-full max-w-2xl px-2 pb-32 pt-2">
      <PageHeader
        title="Users"
        subtitle="Manage customers, agents, and admins."
        className="mb-4"
      />

      <SegmentedControl
        options={usersTabs.map((tab) => ({ value: tab, label: tab }))}
        value={visibleTab}
        onChange={handleTabChange}
        ariaLabel="User type"
        className="mb-5"
      />

      <div>
        {visibleTab === "Agents" && <AgentsList />}
        {visibleTab === "Customers" && <CustomerList />}
        {visibleTab === "Admins" && isSuperuser && <AdminsList />}
      </div>
    </div>
  );
}
