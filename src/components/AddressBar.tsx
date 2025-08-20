// components/AddressBar.tsx (partial update)
"use client";

import { useState, useEffect } from "react";
import { useTabs } from "@/contexts/TabsContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Navigation, RefreshCw, Plus } from "lucide-react";

export default function AddressBar() {
  const { activeTab, tabs, addTab, updateTab, reloadTab } = useTabs();
  const [url, setUrl] = useState("");
  const [isFocused, setIsFocused] = useState(false);

  const activeTabData = tabs.find((tab) => tab.id === activeTab);

  // Update local URL when active tab changes
  useEffect(() => {
    if (activeTabData) {
      setUrl(activeTabData.url);
    }
  }, [activeTabData]);

  const normalizeUrl = (inputUrl: string): string => {
    let finalUrl = inputUrl.trim();

    // Add https:// if no protocol is specified
    if (
      !finalUrl.startsWith("http://") &&
      !finalUrl.startsWith("https://") &&
      !finalUrl.startsWith("file://")
    ) {
      // Check if it's a domain (contains dot) or localhost
      if (finalUrl.includes(".") || finalUrl.includes("localhost")) {
        finalUrl = "https://" + finalUrl;
      } else {
        // It's likely a search query, use Google search
        finalUrl =
          "https://www.google.com/search?q=" + encodeURIComponent(finalUrl);
      }
    }

    // Validate URL format
    try {
      new URL(finalUrl);
      return finalUrl;
    } catch (error) {
      // If URL is invalid, treat as search query
      return "https://www.google.com/search?q=" + encodeURIComponent(inputUrl);
    }
  };

  const handleNavigate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    const finalUrl = normalizeUrl(url);

    if (activeTab) {
      // Update existing active tab
      updateTab(activeTab, {
        url: finalUrl,
        loading: true,
        title: "Loading...", // Set temporary title
      });
    } else {
      // Create a new tab with the URL
      addTab(finalUrl, "Loading...");
    }
  };

  const handleReload = () => {
    if (activeTab) {
      reloadTab(activeTab);
    }
  };

  return (
    <form onSubmit={handleNavigate} className="flex-1 flex mx-4">
      <div className="relative flex-1 flex items-center">
        <Navigation className="absolute left-2 h-4 w-4 text-gray-500 z-10" />
        <Input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Enter URL or search query"
          className="pl-8 pr-20"
          onKeyDown={(e) => {
            // Allow Ctrl+Enter to open in new tab
            if (e.key === "Enter" && e.ctrlKey) {
              e.preventDefault();
              if (url.trim()) {
                addTab(url.trim());
                setUrl(""); // Clear the input after creating new tab
              }
            }
          }}
        />
        {activeTabData?.loading && (
          <RefreshCw className="absolute right-2 h-4 w-4 text-gray-500 animate-spin" />
        )}
      </div>
      <Button type="submit" className="ml-2">
        Go
      </Button>
      {/* {activeTab && (
        <Button
          type="button"
          variant="outline"
          className="ml-2"
          onClick={handleReload}
          disabled={!activeTabData?.url}
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
      )} */}
    </form>
  );
}
