// components/BrowserWindow.tsx
"use client";

import { useTabs } from "@/contexts/TabsContext";
import { useActivity } from "@/contexts/ActivityContext";
import TabBar from "./TabBar";
import ProxyBrowserView from "./ProxyBrowserView";
import NavigationControls from "./NavigationControls";
import AddressBar from "./AddressBar";
import { Button } from "@/components/ui/button";
import { Plus, RefreshCw } from "lucide-react";

export default function BrowserWindow() {
  const { tabs, addTab, activeTab, reloadTab } = useTabs();
  const { recording, startRecording, stopRecording } = useActivity();

  const handleNewTab = () => {
    addTab();
  };

  const handleReloadAll = () => {
    tabs.forEach((tab) => {
      reloadTab(tab.id);
    });
  };

  return (
    <div className="flex flex-col h-full bg-gray-100">
      <div className="flex items-center justify-between p-2 bg-gray-200 border-b border-gray-300">
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="icon"
            onClick={handleNewTab}
            className="h-8 w-8"
            title="New Tab"
          >
            <Plus className="h-4 w-4" />
          </Button>

          <NavigationControls />
        </div>

        <AddressBar />

        <div className="flex items-center space-x-2">
          {tabs.length > 0 && (
            <Button
              variant="outline"
              size="icon"
              onClick={handleReloadAll}
              className="h-8 w-8"
              title="Reload All Tabs"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          )}

          <Button
            variant={recording ? "destructive" : "default"}
            onClick={recording ? stopRecording : startRecording}
            className="h-8"
          >
            {recording ? "Stop Recording" : "Start Recording"}
          </Button>
        </div>
      </div>

      <TabBar />

      <div className="flex-1 overflow-hidden">
        {tabs.length === 0 ? (
          <div className="flex items-center justify-center h-full bg-white">
            <div className="text-center p-8">
              <h2 className="text-2xl font-bold mb-4">No tabs open</h2>
              <p className="text-gray-600 mb-6">
                Click the + button to open a new tab and start browsing
              </p>
              <Button onClick={handleNewTab}>New Tab</Button>
            </div>
          </div>
        ) : (
          tabs.map((tab) => (
            <div
              key={tab.id}
              className={`h-full ${tab.id === activeTab ? "block" : "hidden"}`}
            >
              <ProxyBrowserView tab={tab} />
            </div>
          ))
        )}
      </div>
    </div>
  );
}
