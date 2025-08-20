// app/page.tsx
"use client";

import { useState, useEffect } from "react";
import BrowserWindow from "@/components/BrowserWindow";
import ActivitySidebar from "@/components/ActivitySidebar";
import { TabsProvider } from "@/contexts/TabsContext";
import { ActivityProvider } from "@/contexts/ActivityContext";

export default function Home() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading Productivity Browser...</p>
        </div>
      </div>
    );
  }

  return (
    <TabsProvider>
      <ActivityProvider>
        <div className="flex h-screen bg-gray-100">
          <div
            className={`flex-1 flex flex-col ${
              sidebarOpen ? "w-3/4" : "w-full"
            }`}
          >
            <BrowserWindow />
          </div>
          {sidebarOpen && (
            <div className="w-1/4 border-l border-gray-200">
              <ActivitySidebar onClose={() => setSidebarOpen(false)} />
            </div>
          )}
          {!sidebarOpen && (
            <button
              onClick={() => setSidebarOpen(true)}
              className="absolute right-0 top-1/2 transform -translate-y-1/2 bg-blue-500 text-white p-2 rounded-l-lg"
            >
              Show Activity
            </button>
          )}
        </div>
      </ActivityProvider>
    </TabsProvider>
  );
}
