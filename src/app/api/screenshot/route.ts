// app/api/screenshot/route.ts
import { NextRequest, NextResponse } from "next/server";
import puppeteer from "puppeteer";

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();

    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    const browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();
    await page.goto(url, { waitUntil: "networkidle0" });

    const screenshot = await page.screenshot({ encoding: "base64" });
    await browser.close();

    return NextResponse.json({ screenshot });
  } catch (error) {
    console.error("Screenshot error:", error);
    return NextResponse.json(
      { error: "Failed to capture screenshot" },
      { status: 500 }
    );
  }
}
