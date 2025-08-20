// components/NavigationControls.tsx
"use client";

import { useTabs } from "@/contexts/TabsContext";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, RotateCcw } from "lucide-react";

export default function NavigationControls() {
  const { activeTab, tabs, goBack, goForward, reloadTab } = useTabs();

  const activeTabData = tabs.find((tab) => tab.id === activeTab);

  return (
    <div className="flex items-center space-x-1">
      <Button
        variant="ghost"
        size="icon"
        disabled={!activeTabData?.canGoBack}
        onClick={() => activeTab && goBack(activeTab)}
        className="h-8 w-8"
      >
        <ArrowLeft className="h-4 w-4" />
      </Button>

      <Button
        variant="ghost"
        size="icon"
        disabled={!activeTabData?.canGoForward}
        onClick={() => activeTab && goForward(activeTab)}
        className="h-8 w-8"
      >
        <ArrowRight className="h-4 w-4" />
      </Button>

      <Button
        variant="ghost"
        size="icon"
        onClick={() => activeTab && reloadTab(activeTab)}
        className="h-8 w-8"
      >
        <RotateCcw className="h-4 w-4" />
      </Button>
    </div>
  );
}
