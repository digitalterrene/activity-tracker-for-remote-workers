// app/api/sessions/route.ts
import { NextResponse } from "next/server";
import { MongoClient } from "mongodb";

export async function POST(request: Request) {
  try {
    const sessionData = await request.json();

    // Validate required fields
    if (!sessionData.startTime) {
      return NextResponse.json(
        { error: "Start time is required" },
        { status: 400 }
      );
    }

    const client = await MongoClient.connect(process.env.MONGODB_URI!);
    const db = client.db("ProductivityBrowser");

    // Insert session into database
    const result = await db.collection("sessions").insertOne({
      ...sessionData,
      createdAt: new Date(),
    });

    await client.close();

    return NextResponse.json(
      {
        success: true,
        sessionId: result.insertedId.toString(),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Session creation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const date = searchParams.get("date");

    const client = await MongoClient.connect(process.env.MONGODB_URI!);
    const db = client.db("ProductivityBrowser");

    // Build query
    const query: any = {};
    if (userId) query.userId = userId;
    if (date) {
      const startDate = new Date(date);
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 1);

      query.startTime = {
        $gte: startDate,
        $lt: endDate,
      };
    }

    // Get sessions from database
    const sessions = await db
      .collection("sessions")
      .find(query)
      .sort({ startTime: -1 })
      .toArray();

    await client.close();

    return NextResponse.json({
      success: true,
      sessions,
      count: sessions.length,
    });
  } catch (error) {
    console.error("Sessions fetch error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
