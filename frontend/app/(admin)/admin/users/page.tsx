"use client";

import { useState } from "react";

import AdminsList from "@/components/pages/admin/users/AdminsList";
import AgentsList from "@/components/pages/admin/users/AgentsList";
import CustomerList from "@/components/pages/admin/users/CustomersList";
import SubAdminsList from "@/components/pages/admin/settings/SubAdminsList";
import PageHeader from "@/components/ui/app/PageHeader";
import SegmentedControl from "@/components/ui/app/SegmentedControl";
import { useAuth } from "@/context/AuthContext";

type Tab = "Customers" | "Agents" | "Admins" | "Sub Admins";

export default function CustomersPage() {
  const { role, permissions } = useAuth();
  const isAdmin = role === "ADMIN";
  const [activeTab, setActiveTab] = useState<Tab>(() => {
    if (typeof window !== "undefined") {
      return (
        (sessionStorage.getItem("adminUsersActiveTab") as Tab) || "Customers"
      );
    }
    return "Customers";
  });

  const usersTabs: Tab[] = [
    "Customers",
    ...(isAdmin || permissions.agents_view ? (["Agents"] as Tab[]) : []),
    ...(isAdmin ? (["Admins", "Sub Admins"] as Tab[]) : []),
  ];
  const visibleTab = usersTabs.includes(activeTab) ? activeTab : "Customers";

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    sessionStorage.setItem("adminUsersActiveTab", tab);
  };

  return (
    <div className="mx-auto min-h-screen w-full max-w-2xl px-2 pb-32 pt-2">
      <PageHeader
        title="Users"
        subtitle="Manage customers, agents, admins, and sub admins."
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
        {visibleTab === "Admins" && isAdmin && <AdminsList />}
        {visibleTab === "Sub Admins" && isAdmin && <SubAdminsList />}
      </div>
    </div>
  );
}
