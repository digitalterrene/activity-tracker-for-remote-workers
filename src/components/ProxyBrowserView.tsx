// components/ProxyBrowserView.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { useActivity } from "@/contexts/ActivityContext";
import { useTabs } from "@/contexts/TabsContext";
import { Tab } from "@/contexts/TabsContext";

interface ProxyBrowserViewProps {
  tab: Tab;
}

// Mode tracking - we'll use sessionStorage to remember mode per domain
const getDomainModeKey = (url: string) => {
  try {
    const domain = new URL(url).hostname;
    return `browser-mode-${domain}`;
  } catch {
    return null;
  }
};

const getPreferredModeForDomain = (url: string): "proxy" | "direct" => {
  if (typeof window === "undefined") return "proxy";

  const key = getDomainModeKey(url);
  if (!key) return "proxy";

  const savedMode = sessionStorage.getItem(key);
  return (savedMode as "proxy" | "direct") || "proxy";
};

const setPreferredModeForDomain = (url: string, mode: "proxy" | "direct") => {
  if (typeof window === "undefined") return;

  const key = getDomainModeKey(url);
  if (key) {
    sessionStorage.setItem(key, mode);
  }
};

export default function ProxyBrowserView({ tab }: ProxyBrowserViewProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const { addActivity, recording } = useActivity();
  const { updateTab } = useTabs();
  const [loaded, setLoaded] = useState(false);
  const [currentMode, setCurrentMode] = useState<"proxy" | "direct">(() =>
    getPreferredModeForDomain(tab.url)
  );
  const [error, setError] = useState<string | null>(null);
  const loadCheckTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Generate URLs for both proxy and direct access
  const getProxyUrl = (url: string) => {
    return `/api/proxy?url=${encodeURIComponent(url)}`;
  };

  const getDirectUrl = (url: string) => {
    return url;
  };

  // Check if iframe content is actually visible/loaded properly
  const checkIframeContent = (): { loaded: boolean; reason: string } => {
    if (!iframeRef.current)
      return { loaded: false, reason: "No iframe reference" };

    try {
      const iframe = iframeRef.current;
      const iframeDoc =
        iframe.contentDocument || iframe.contentWindow?.document;

      if (!iframeDoc) return { loaded: false, reason: "No document object" };

      // Check if iframe has meaningful content (not blank or error page)
      const body = iframeDoc.body;
      if (!body) return { loaded: false, reason: "No body element" };

      // Check for common error indicators
      const bodyText = body.innerText || "";
      const isErrorPage =
        bodyText.includes("error") ||
        bodyText.includes("not available") ||
        bodyText.includes("refused") ||
        bodyText.includes("blocked") ||
        bodyText.includes("cannot display") ||
        bodyText.includes("security") ||
        bodyText.includes("frame") ||
        bodyText.includes("X-Frame-Options");

      // Check if iframe has meaningful content
      const hasContent =
        body.children.length > 0 ||
        bodyText.trim().length > 50 ||
        body.innerHTML.includes("<body") ||
        iframeDoc.title !== "";

      if (!hasContent) {
        return { loaded: false, reason: "No meaningful content detected" };
      }

      if (isErrorPage) {
        return { loaded: false, reason: "Error page detected" };
      }

      return { loaded: true, reason: "Content loaded successfully" };
    } catch (error) {
      // Cross-origin error - can't access iframe content
      // This often means the site has X-Frame-Options set to deny
      return { loaded: false, reason: "Cross-origin access blocked" };
    }
  };

  // Handle successful load
  const handleLoadSuccess = () => {
    setError(null);

    if (recording) {
      addActivity({
        type: "navigation",
        tabId: tab.id,
        url: tab.url,
        details: {
          value: `Page loaded via ${currentMode}`,
          method: currentMode,
        },
      });
    }

    // Update tab loading state
    updateTab(tab.id, { loading: false });

    // Try to get the title from the iframe
    try {
      const iframe = iframeRef.current;
      if (iframe && iframe.contentDocument) {
        const title = iframe.contentDocument.title;
        if (title && title !== tab.title) {
          updateTab(tab.id, { title });
        }
      }
    } catch (error) {
      // Cross-origin error, we'll rely on the message-based title update
    }

    // Remember successful mode for this domain
    setPreferredModeForDomain(tab.url, currentMode);
  };

  // Handle load failure
  const handleLoadFailure = (reason: string) => {
    setError(`Failed to load with ${currentMode}: ${reason}`);
    updateTab(tab.id, { loading: false });

    addActivity({
      type: "navigation",
      tabId: tab.id,
      url: tab.url,
      details: {
        value: `Failed with ${currentMode}`,
        method: currentMode,
        reason,
      },
    });
  };

  // Handle iframe load event
  const handleIframeLoad = () => {
    if (loadCheckTimeoutRef.current) {
      clearTimeout(loadCheckTimeoutRef.current);
    }

    setLoaded(true);

    // Check if content actually loaded properly after a short delay
    loadCheckTimeoutRef.current = setTimeout(() => {
      const { loaded: contentLoaded, reason } = checkIframeContent();

      if (contentLoaded) {
        handleLoadSuccess();
      } else {
        handleLoadFailure(reason);
      }
    }, 1500); // Wait 1.5 seconds after load to check content
  };

  // Handle iframe error (network errors)
  const handleIframeError = () => {
    handleLoadFailure("Network error");
  };

  // Handle manual mode switch to direct
  const switchToDirectMode = () => {
    setCurrentMode("direct");
    setError("Switching to direct mode...");
    updateTab(tab.id, { loading: true });

    addActivity({
      type: "navigation",
      tabId: tab.id,
      url: tab.url,
      details: {
        value: "Manually switching to direct mode",
        method: "manual",
      },
    });
  };

  // Handle manual mode switch to proxy
  const switchToProxyMode = () => {
    setCurrentMode("proxy");
    setError("Switching to proxy mode...");
    updateTab(tab.id, { loading: true });

    addActivity({
      type: "navigation",
      tabId: tab.id,
      url: tab.url,
      details: {
        value: "Manually switching to proxy mode",
        method: "manual",
      },
    });
  };

  // Handle message events from the iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Handle title changes
      if (event.data.type === "titleChanged") {
        updateTab(tab.id, { title: event.data.title });
      }

      // Handle manual mode switch requests from error page
      if (event.data.type === "tryDirectMode") {
        switchToDirectMode();
      }

      // Handle proxy error messages
      if (event.data.type === "proxyError") {
        handleLoadFailure(`Proxy error: ${event.data.error}`);
      }

      // Handle activity tracking
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
  }, [tab.id, tab.url, addActivity, recording, updateTab, currentMode]);

  // Reset state when tab URL changes
  useEffect(() => {
    const newMode = getPreferredModeForDomain(tab.url);
    setCurrentMode(newMode);
    setError(null);
    setLoaded(false);

    if (loadCheckTimeoutRef.current) {
      clearTimeout(loadCheckTimeoutRef.current);
    }
  }, [tab.url]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (loadCheckTimeoutRef.current) {
        clearTimeout(loadCheckTimeoutRef.current);
      }
    };
  }, []);

  // Get the appropriate URL based on current mode
  const getCurrentUrl = () => {
    return currentMode === "proxy"
      ? getProxyUrl(tab.url)
      : getDirectUrl(tab.url);
  };

  return (
    <div className="h-full w-full bg-white relative">
      {tab.loading && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-blue-500 animate-pulse">
          <div className="h-full bg-blue-700 rounded-r-full animate-[loading_1.5s_ease-in-out_infinite]"></div>
        </div>
      )}

      {error && (
        <div className="absolute top-12 left-2 right-2 bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded z-10">
          <div className="flex justify-between items-center">
            <span className="flex-1">{error}</span>
            <div className="flex space-x-2 ml-4">
              <button
                onClick={switchToProxyMode}
                className="text-yellow-800 hover:text-yellow-900 font-bold px-2 py-1 border border-yellow-600 rounded text-xs"
              >
                Use Proxy
              </button>
              <button
                onClick={switchToDirectMode}
                className="text-yellow-800 hover:text-yellow-900 font-bold px-2 py-1 border border-yellow-600 rounded text-xs"
              >
                Use Direct
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="absolute top-2 right-2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-70 z-10">
        {currentMode === "proxy" ? "Proxy Mode" : "Direct Mode"}
      </div>

      <iframe
        key={`${tab.id}-${currentMode}`}
        ref={iframeRef}
        src={getCurrentUrl()}
        className="w-full h-full border-none"
        sandbox="allow-scripts allow-forms allow-popups allow-modals allow-same-origin"
        onLoad={handleIframeLoad}
        onError={handleIframeError}
        allow="*"
      />
    </div>
  );
}
