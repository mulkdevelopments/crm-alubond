import { NextResponse } from "next/server";

export function GET() {
  const sha256 = process.env.ANDROID_APP_LINK_SHA256?.trim();
  if (!sha256) {
    return new NextResponse("Android app link fingerprint is not configured.", { status: 404 });
  }

  const body = [
    {
      relation: ["delegate_permission/common.handle_all_urls"],
      target: {
        namespace: "android_app",
        package_name: "com.alubond.crm",
        sha256_cert_fingerprints: [sha256],
      },
    },
  ];

  return NextResponse.json(body, {
    headers: {
      "Content-Type": "application/json",
    },
  });
}
