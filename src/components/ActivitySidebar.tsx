// components/ActivitySidebar.tsx
"use client";

import { useActivity } from "@/contexts/ActivityContext";
import { useTabs } from "@/contexts/TabsContext";
import { Button } from "@/components/ui/button";
import { X, Trash2, Play, Square } from "lucide-react";
import { format } from "date-fns";

interface ActivitySidebarProps {
  onClose: () => void;
}

export default function ActivitySidebar({ onClose }: ActivitySidebarProps) {
  const {
    activities,
    recording,
    startRecording,
    stopRecording,
    clearActivities,
  } = useActivity();
  const { tabs } = useTabs();

  const getTabTitle = (tabId: string) => {
    const tab = tabs.find((t) => t.id === tabId);
    return tab ? tab.title : "Unknown Tab";
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "navigation":
        return "🌐";
      case "click":
        return "🖱️";
      case "input":
        return "⌨️";
      case "scroll":
        return "📜";
      case "tab_change":
        return "📑";
      case "tab_created":
        return "➕";
      case "tab_closed":
        return "❌";
      default:
        return "📝";
    }
  };

  return (
    <div className="h-full flex flex-col bg-white border-l border-gray-200">
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold">Activity Log</h2>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">Recording</span>
          <div className="flex items-center space-x-2">
            {recording ? (
              <Button variant="destructive" size="sm" onClick={stopRecording}>
                <Square className="h-3 w-3 mr-1" /> Stop
              </Button>
            ) : (
              <Button size="sm" onClick={startRecording}>
                <Play className="h-3 w-3 mr-1" /> Start
              </Button>
            )}
            <Button variant="outline" size="icon" onClick={clearActivities}>
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>
        <div className="text-xs text-gray-500">
          {recording ? (
            <span className="text-green-600">● Recording</span>
          ) : (
            <span className="text-gray-400">○ Paused</span>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {activities.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <p>No activities recorded yet</p>
            <p className="text-sm mt-2">
              Start recording to track your work activities
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {activities
              .slice()
              .reverse()
              .map((activity) => (
                <div
                  key={activity.id}
                  className="p-3 border border-gray-200 rounded-lg mb-2"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center">
                      <span className="text-lg mr-2">
                        {getActivityIcon(activity.type)}
                      </span>
                      <div>
                        <div className="text-sm font-medium capitalize">
                          {activity.type.replace(/_/g, " ")}
                        </div>
                        <div className="text-xs text-gray-500">
                          {format(activity.timestamp, "HH:mm:ss.SSS")}
                        </div>
                      </div>
                    </div>
                    <div className="text-xs text-gray-500">
                      {getTabTitle(activity.tabId)}
                    </div>
                  </div>

                  {activity.url && (
                    <div className="text-xs text-blue-600 truncate mt-1">
                      {activity.url}
                    </div>
                  )}

                  {activity.details && (
                    <div className="text-xs text-gray-600 mt-1 space-y-1">
                      {activity.details.element && (
                        <div>Element: {activity.details.element}</div>
                      )}
                      {activity.details.id && (
                        <div>ID: {activity.details.id}</div>
                      )}
                      {activity.details.name && (
                        <div>Name: {activity.details.name}</div>
                      )}
                      {activity.details.value !== undefined && (
                        <div>Value: {String(activity.details.value)}</div>
                      )}
                      {activity.details.text && (
                        <div>Text: {activity.details.text}</div>
                      )}
                      {activity.details.x !== undefined &&
                        activity.details.y !== undefined && (
                          <div>
                            Position: {activity.details.x}, {activity.details.y}
                          </div>
                        )}
                      {activity.details.percent !== undefined && (
                        <div>Scrolled: {activity.details.percent}%</div>
                      )}
                      {activity.details.duration && (
                        <div>Duration: {activity.details.duration}ms</div>
                      )}
                      {activity.details.state && (
                        <div>State: {activity.details.state}</div>
                      )}
                    </div>
                  )}
                </div>
              ))}
          </div>
        )}
      </div>

      <div className="p-4 border-t border-gray-200 text-xs text-gray-500">
        <div>Total activities: {activities.length}</div>
        <div>
          Session started:{" "}
          {activities.length > 0
            ? format(activities[0].timestamp, "PPpp")
            : "N/A"}
        </div>
      </div>
    </div>
  );
}
