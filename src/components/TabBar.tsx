// components/TabBar.tsx
"use client";

import { useTabs } from "@/contexts/TabsContext";
import { X, Circle } from "lucide-react";
import { cn } from "@/lib/utils";

export default function TabBar() {
  const { tabs, activeTab, setActiveTab, closeTab } = useTabs();

  if (tabs.length === 0) return null;

  return (
    <div className="flex items-center bg-gray-200 border-b border-gray-300 overflow-x-auto">
      {tabs.map((tab) => (
        <div
          key={tab.id}
          className={cn(
            "flex items-center max-w-xs min-w-40 px-3 py-2 border-r border-gray-300 group",
            tab.id === activeTab ? "bg-white" : "bg-gray-100 hover:bg-gray-50"
          )}
        >
          <button
            onClick={() => setActiveTab(tab.id)}
            className="flex items-center flex-1 min-w-0"
          >
            {tab.favicon ? (
              <img src={tab.favicon} alt="" className="w-4 h-4 mr-2" />
            ) : (
              <Circle className="w-4 h-4 mr-2 text-gray-400" />
            )}
            <span className="truncate text-sm">{tab.title}</span>
          </button>

          <button
            onClick={() => closeTab(tab.id)}
            className="ml-2 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <X className="w-4 h-4 text-gray-500 hover:text-gray-700" />
          </button>
        </div>
      ))}
    </div>
  );
}
