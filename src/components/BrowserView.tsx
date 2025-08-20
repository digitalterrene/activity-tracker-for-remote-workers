// components/BrowserView.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { useActivity } from "@/contexts/ActivityContext";
import { useTabs } from "@/contexts/TabsContext";
import { Tab } from "@/contexts/TabsContext";

interface BrowserViewProps {
  tab: Tab;
}

export default function BrowserView({ tab }: BrowserViewProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const { addActivity, recording } = useActivity();
  const { tabs, activeTab } = useTabs();
  const [loaded, setLoaded] = useState(false);

  // Handle iframe load event
  const handleIframeLoad = () => {
    setLoaded(true);

    if (recording) {
      addActivity({
        type: "navigation",
        tabId: tab.id,
        url: tab.url,
        details: { value: "Page loaded completely" },
      });
    }
  };

  // Message event listener for communication with tracked sites
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Security check - only process messages from our tracked sites
      // Note: In production, you should validate the event.origin

      if (
        event.data.type === "activities_flush" &&
        Array.isArray(event.data.activities)
      ) {
        // Add all activities from the flush
        event.data.activities.forEach((activity: any) => {
          addActivity({
            type: activity.type,
            tabId: tab.id,
            url: activity.url || tab.url,
            details: activity.details,
          });
        });
      } else if (event.data.type === "activityTracked") {
        // Handle individual activities (backward compatibility)
        addActivity({
          type: event.data.activityType,
          tabId: tab.id,
          url: tab.url,
          details: event.data.details,
        });
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [tab.id, tab.url, addActivity, recording]);

  return (
    <div className="h-full w-full bg-white">
      {tab.loading && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-blue-500 animate-pulse">
          <div className="h-full bg-blue-700 rounded-r-full animate-[loading_1.5s_ease-in-out_infinite]"></div>
        </div>
      )}

      <iframe
        ref={iframeRef}
        src={tab.url}
        className="w-full h-full border-none"
        sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals"
        onLoad={handleIframeLoad}
      />
    </div>
  );
}
