import { NextResponse } from "next/server";

export function GET() {
  const teamId = process.env.APPLE_TEAM_ID?.trim();
  if (!teamId) {
    return new NextResponse("Apple Team ID is not configured.", { status: 404 });
  }

  const body = {
    applinks: {
      apps: [],
      details: [
        {
          appIDs: [`${teamId}.com.alubond.crm`],
          paths: ["/reset-password", "/reset-password/*"],
        },
      ],
    },
  };

  return NextResponse.json(body, {
    headers: {
      "Content-Type": "application/json",
    },
  });
}
