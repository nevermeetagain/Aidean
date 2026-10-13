import { readFile } from "node:fs/promises";
import { join } from "node:path";

export async function GET() {
  try {
    const filePath = join(process.cwd(), ".docs", "logo.svg");
    const svg = await readFile(filePath);

    return new Response(svg, {
      status: 200,
      headers: {
        "content-type": "image/svg+xml; charset=utf-8",
        "cache-control": "public, max-age=0, must-revalidate"
      }
    });
  } catch {
    return new Response(null, { status: 404 });
  }
}
