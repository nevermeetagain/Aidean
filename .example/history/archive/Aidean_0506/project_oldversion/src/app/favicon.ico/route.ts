export function GET() {
  return new Response(null, {
    status: 200,
    headers: {
      "content-type": "image/x-icon"
    }
  });
}

