import { NextRequest, NextResponse } from "next/server";
import { generateQRPng, generateQRSvg } from "@/lib/qr/generate";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const { eventId } = await params;
  const searchParams = request.nextUrl.searchParams;
  const format = searchParams.get("format") ?? "png";
  const size = parseInt(searchParams.get("size") ?? "512", 10);

  // Use the actual origin from the request to ensure the QR code works on production/localhost automatically
  const origin = request.nextUrl.origin;
  const eventUrl = `${origin}/e/${eventId}`;

  try {
    if (format === "svg") {
      const svg = await generateQRSvg(eventUrl);
      return new NextResponse(svg, {
        headers: {
          "Content-Type": "image/svg+xml",
          "Content-Disposition": `attachment; filename="qr-${eventId}.svg"`,
        },
      });
    }

    const png = await generateQRPng(eventUrl, size);
    return new NextResponse(new Uint8Array(png), {
      headers: {
        "Content-Type": "image/png",
        "Content-Disposition": `attachment; filename="qr-${eventId}.png"`,
      },
    });
  } catch (error) {
    console.error("QR generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate QR code" },
      { status: 500 }
    );
  }
}
