"use client";

import DatePicker from "./date-picker";
import StockFlowSelect from "./custom/stockFlowSelect";
import AsyncSelect from "react-select/async";
import { customerApi } from "@/lib/api/customer";
import Button from "./app/Button";

interface Tab {
  value: string;
  label: string;
}

interface FilterBarProps {
  fromDate: string;
  toDate: string;
  onFromDateChange: (date: string) => void;
  onToDateChange: (date: string) => void;
  agents?: { id: number; username: string }[];
  selectedAgent?: string;
  onAgentChange?: (agentId: string) => void;
  selectedCustomer?: string;
  onCustomerChange?: (customerId: string) => void;
  isOpen: boolean;
  onClear: () => void;
  tabs?: Tab[];
  activeTab?: string;
  onTabChange?: (val: string) => void;
}

export default function FilterBar({
  fromDate,
  toDate,
  onFromDateChange,
  onToDateChange,
  agents = [],
  selectedAgent = "",
  onAgentChange,
  selectedCustomer = "",
  onCustomerChange,
  isOpen,
  onClear,
  tabs = [],
  activeTab,
  onTabChange,
}: FilterBarProps) {
  if (!isOpen) return null;

  const hasFilters =
    fromDate ||
    toDate ||
    (selectedAgent && selectedAgent !== "all") ||
    (selectedCustomer && selectedCustomer !== "all");

  const loadCustomers = async (inputValue: string) => {
    const response = await customerApi.getAll({
      search: inputValue,
      page: 1,
      page_size: 20,
    });
    return [
      { value: "all", label: "All Customers" },
      ...response.results.map((customer) => ({
        value: String(customer.id),
        label: customer.name,
      })),
    ];
  };

  return (
    <div className="rounded-card border border-app-line bg-app-soft/60 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[140px] flex-1">
          <DatePicker
            value={fromDate}
            onChange={onFromDateChange}
            placeholder="From date"
          />
        </div>

        <span className="text-xs font-medium text-app-muted">to</span>

        <div className="relative min-w-[140px] flex-1">
          <DatePicker
            value={toDate}
            onChange={onToDateChange}
            placeholder="To date"
          />
        </div>

        {agents.length > 0 && onAgentChange && (
          <>
            <span className="text-[11px] font-semibold uppercase tracking-wide text-app-muted">
              Agent
            </span>
            <div className="min-w-[140px] flex-1">
              <StockFlowSelect
                value={selectedAgent}
                onChange={onAgentChange}
                placeholder="All Agents"
                options={[
                  { value: "all", label: "All Agents" },
                  ...agents.map((agent) => ({
                    value: String(agent.id),
                    label: agent.username,
                  })),
                ]}
              />
            </div>
          </>
        )}

        {onCustomerChange && (
          <>
            <span className="text-[11px] font-semibold uppercase tracking-wide text-app-muted">
              Customer
            </span>
            <div className="min-w-[140px] flex-1">
              <AsyncSelect
                isClearable
                defaultOptions
                loadOptions={loadCustomers}
                value={
                  selectedCustomer && selectedCustomer !== "all"
                    ? { value: selectedCustomer, label: selectedCustomer }
                    : null
                }
                onChange={(option) => onCustomerChange(option?.value ?? "all")}
                placeholder="All Customers"
                classNames={{
                  control: () =>
                    "!min-h-12 !rounded-control !border-app-line !bg-app-card !text-sm !shadow-none",
                  menu: () =>
                    "!rounded-control !border !border-app-line !bg-app-card !shadow-card",
                  option: () =>
                    "!cursor-pointer !rounded-control !text-sm hover:!bg-app-soft",
                  singleValue: () => "!text-app-ink",
                  placeholder: () => "!text-app-subtle",
                  input: () => "!text-app-ink",
                }}
              />
            </div>
          </>
        )}

        {tabs.length > 0 && onTabChange && (
          <div className="flex w-full items-center gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-app-muted">
              Item type
            </span>
            <div className="min-w-[140px] flex-1">
              <StockFlowSelect
                value={activeTab!}
                onChange={onTabChange}
                placeholder="All"
                options={tabs.map((tab) => ({
                  value: String(tab.value),
                  label: String(tab.label),
                }))}
              />
            </div>
          </div>
        )}

        {hasFilters && (
          <Button
            variant="ghost"
            onClick={onClear}
            className="text-brand-red hover:bg-brand-red/10 hover:text-brand-red"
          >
            Clear filters
          </Button>
        )}
      </div>
    </div>
  );
}
