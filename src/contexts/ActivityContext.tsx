// contexts/ActivityContext.tsx
"use client";

import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
  useEffect,
} from "react";

export interface ActivityEvent {
  id: string;
  type:
    | "navigation"
    | "click"
    | "input"
    | "scroll"
    | "tab_change"
    | "tab_created"
    | "tab_closed"
    | "visibility_change"
    | "form_submit"
    | "focus"
    | "ajax_request"
    | "fetch_request"
    | "page_load"
    | "mouse_movement";
  timestamp: Date;
  tabId: string;
  url?: string;
  details?: {
    element?: string;
    value?: string;
    text?: string;
    coordinates?: { x: number; y: number };
    duration?: number;
    percent?: number;
    state?: string;
    id?: string;
    name?: string;
    className?: string;
    valueLength?: number;
    method?: string;
    status?: number;
    responseType?: string;
    loadTime?: number;
    resources?: any[];
    movements?: any[];
    inputs?: any[];
    viewportHeight?: number;
    totalHeight?: number;
  };
  screenshot?: string;
}

interface ActivityContextType {
  activities: ActivityEvent[];
  recording: boolean;
  startRecording: () => void;
  stopRecording: () => void;
  addActivity: (event: Omit<ActivityEvent, "id" | "timestamp">) => void;
  clearActivities: () => void;
}

const ActivityContext = createContext<ActivityContextType | undefined>(
  undefined
);

export const useActivity = () => {
  const context = useContext(ActivityContext);
  if (context === undefined) {
    throw new Error("useActivity must be used within an ActivityProvider");
  }
  return context;
};

interface ActivityProviderProps {
  children: ReactNode;
}

export const ActivityProvider: React.FC<ActivityProviderProps> = ({
  children,
}) => {
  const [activities, setActivities] = useState<ActivityEvent[]>([]);
  const [recording, setRecording] = useState<boolean>(false);

  useEffect(() => {
    // Load recording state from localStorage
    const savedRecording = localStorage.getItem("activityRecording");
    if (savedRecording) {
      setRecording(savedRecording === "true");
    }

    // Load activities from localStorage
    const savedActivities = localStorage.getItem("activityEvents");
    if (savedActivities) {
      try {
        setActivities(
          JSON.parse(savedActivities).map((act: any) => ({
            ...act,
            timestamp: new Date(act.timestamp),
          }))
        );
      } catch (e) {
        console.error("Failed to parse saved activities:", e);
      }
    }
  }, []);

  useEffect(() => {
    // Save recording state to localStorage
    localStorage.setItem("activityRecording", recording.toString());
  }, [recording]);

  useEffect(() => {
    // Save activities to localStorage
    localStorage.setItem("activityEvents", JSON.stringify(activities));
  }, [activities]);

  const startRecording = () => {
    setRecording(true);
    addActivity({
      type: "tab_change",
      tabId: "system",
      details: { value: "Recording started" },
    });
  };

  const stopRecording = () => {
    addActivity({
      type: "tab_change",
      tabId: "system",
      details: { value: "Recording stopped" },
    });
    setRecording(false);
  };

  const addActivity = (event: Omit<ActivityEvent, "id" | "timestamp">) => {
    if (!recording) return;

    const newActivity: ActivityEvent = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date(),
      ...event,
    };

    setActivities((prev) => [...prev, newActivity]);

    // Send to API if in production
    if (process.env.NODE_ENV === "production") {
      fetch("/api/activities", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newActivity),
      }).catch((err) => console.error("Failed to save activity:", err));
    }
  };

  const clearActivities = () => {
    setActivities([]);
    localStorage.removeItem("activityEvents");
  };

  return (
    <ActivityContext.Provider
      value={{
        activities,
        recording,
        startRecording,
        stopRecording,
        addActivity,
        clearActivities,
      }}
    >
      {children}
    </ActivityContext.Provider>
  );
};
