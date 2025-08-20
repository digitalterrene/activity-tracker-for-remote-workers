// app/api/activities/route.ts
import { NextResponse } from "next/server";
import { MongoClient } from "mongodb";

interface ActivityEvent {
  id: string;
  type: string;
  timestamp: Date;
  tabId: string;
  url?: string;
  details?: any;
  sessionId?: string;
}

export async function POST(request: Request) {
  try {
    const activityData: ActivityEvent | ActivityEvent[] = await request.json();
    const activities = Array.isArray(activityData)
      ? activityData
      : [activityData];

    // Validate required fields
    for (const activity of activities) {
      if (!activity.type || !activity.timestamp || !activity.tabId) {
        return NextResponse.json(
          {
            error: "Type, timestamp, and tabId are required for all activities",
          },
          { status: 400 }
        );
      }
    }
    //forc push
    const client = await MongoClient.connect(process.env.MONGODB_URI!);
    const db = client.db("ProductivityBrowser");

    // Add session ID if not provided
    const activitiesWithSession = activities.map((activity) => ({
      ...activity,
      sessionId: activity.sessionId || getCurrentSessionId(),
      recordedAt: new Date(),
    }));

    // Insert activities into database
    const result = await db
      .collection("activities")
      .insertMany(activitiesWithSession);

    await client.close();

    return NextResponse.json(
      {
        success: true,
        count: result.insertedCount,
        activityIds: Object.values(result.insertedIds).map((id) =>
          id.toString()
        ),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Activity recording error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Helper function to get or create a session ID
function getCurrentSessionId(): string {
  // In a real implementation, you might get this from cookies or generate a persistent ID
  if (typeof window !== "undefined") {
    let sessionId = localStorage.getItem("currentSessionId");
    if (!sessionId) {
      sessionId = Math.random().toString(36).substr(2, 9);
      localStorage.setItem("currentSessionId", sessionId);
    }
    return sessionId;
  }
  return Math.random().toString(36).substr(2, 9);
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const tabId = searchParams.get("tabId");
    const sessionId = searchParams.get("sessionId");
    const date = searchParams.get("date");
    const type = searchParams.get("type");
    const limit = parseInt(searchParams.get("limit") || "100");
    const skip = parseInt(searchParams.get("skip") || "0");

    const client = await MongoClient.connect(process.env.MONGODB_URI!);
    const db = client.db("ProductivityBrowser");

    // Build query
    const query: any = {};
    if (tabId) query.tabId = tabId;
    if (sessionId) query.sessionId = sessionId;
    if (type) query.type = type;
    if (date) {
      const startDate = new Date(date);
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 1);

      query.timestamp = {
        $gte: startDate,
        $lt: endDate,
      };
    }

    // Get activities from database
    const activities = await db
      .collection("activities")
      .find(query)
      .sort({ timestamp: -1 })
      .limit(limit)
      .skip(skip)
      .toArray();

    const totalCount = await db.collection("activities").countDocuments(query);

    await client.close();

    return NextResponse.json({
      success: true,
      activities,
      totalCount,
      returnedCount: activities.length,
    });
  } catch (error) {
    console.error("Activity fetch error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
