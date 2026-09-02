import { NextRequest } from "next/server";
import fs from "fs";
import path from "path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Serves ERC-721 token metadata for StonkInu Broker #<id> as application/json.
// The stored `image` path is rewritten to an absolute URL for the requesting host,
// so wallets and marketplaces resolve it correctly on any domain.
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const id = (params.id || "").replace(/[^0-9]/g, "");
  const n = Number(id);
  if (!id || n < 1 || n > 999) {
    return Response.json({ error: "Unknown token" }, { status: 404 });
  }

  const file = path.join(process.cwd(), "data", "nft-metadata", id);
  let meta: Record<string, unknown>;
  try {
    meta = JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return Response.json({ error: "Metadata not found" }, { status: 404 });
  }

  const origin = req.nextUrl.origin;
  if (typeof meta.image === "string" && (meta.image as string).startsWith("/")) {
    meta.image = origin + meta.image;
  }

  return new Response(JSON.stringify(meta), {
    headers: {
      "content-type": "application/json",
      "cache-control": "public, max-age=3600, s-maxage=86400",
    },
  });
}
