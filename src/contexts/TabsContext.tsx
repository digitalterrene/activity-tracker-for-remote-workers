// contexts/TabsContext.tsx
"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";

export interface Tab {
  id: string;
  title: string;
  url: string;
  favicon?: string;
  canGoBack: boolean;
  canGoForward: boolean;
  loading: boolean;
}

interface TabsContextType {
  tabs: Tab[];
  activeTab: string | null;
  addTab: (url?: string, title?: string) => string;
  closeTab: (id: string) => void;
  setActiveTab: (id: string) => void;
  updateTab: (id: string, updates: Partial<Tab>) => void;
  goBack: (id: string) => void;
  goForward: (id: string) => void;
  reloadTab: (id: string) => void;
}

const TabsContext = createContext<TabsContextType | undefined>(undefined);

export const useTabs = () => {
  const context = useContext(TabsContext);
  if (context === undefined) {
    throw new Error("useTabs must be used within a TabsProvider");
  }
  return context;
};

interface TabsProviderProps {
  children: ReactNode;
}

export const TabsProvider: React.FC<TabsProviderProps> = ({ children }) => {
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [activeTab, setActiveTab] = useState<string | null>(null);

  const addTab = (
    url: string = "https://www.google.com",
    title: string = "New Tab"
  ) => {
    const newTab: Tab = {
      id: Math.random().toString(36).substr(2, 9),
      title: title,
      url,
      canGoBack: false,
      canGoForward: false,
      loading: true,
    };

    setTabs([...tabs, newTab]);
    setActiveTab(newTab.id);

    return newTab.id;
  };

  const closeTab = (id: string) => {
    const newTabs = tabs.filter((tab) => tab.id !== id);
    setTabs(newTabs);

    if (activeTab === id) {
      setActiveTab(newTabs.length > 0 ? newTabs[newTabs.length - 1].id : null);
    }
  };

  const updateTab = (id: string, updates: Partial<Tab>) => {
    setTabs((prevTabs) =>
      prevTabs.map((tab) => (tab.id === id ? { ...tab, ...updates } : tab))
    );
  };

  const goBack = (id: string) => {
    // Implementation for going back in tab history
    console.log("Go back:", id);
  };

  const goForward = (id: string) => {
    // Implementation for going forward in tab history
    console.log("Go forward:", id);
  };

  const reloadTab = (id: string) => {
    // Set loading state and force iframe reload by updating the URL
    updateTab(id, { loading: true });

    // Force iframe reload by triggering a state change
    const tab = tabs.find((t) => t.id === id);
    if (tab) {
      // This will force the iframe to reload by changing the key prop
      updateTab(id, {
        url: tab.url + (tab.url.includes("?") ? "&" : "?") + "t=" + Date.now(),
      });
    }
  };

  return (
    <TabsContext.Provider
      value={{
        tabs,
        activeTab,
        addTab,
        closeTab,
        setActiveTab,
        updateTab,
        goBack,
        goForward,
        reloadTab,
      }}
    >
      {children}
    </TabsContext.Provider>
  );
};
