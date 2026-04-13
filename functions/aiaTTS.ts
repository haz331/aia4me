// AIA 4 Me — Text to speech (accepts API key at runtime)
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  }

  try {
    const { text, apiKey, voice } = await req.json();

    if (!text) return Response.json({ error: "No text provided" }, { status: 400 });
    if (!apiKey) return Response.json({ error: "No API key provided" }, { status: 400 });

    const res = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "tts-1",
        voice: voice || "onyx",
        input: text,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      return Response.json({ error: err }, { status: 500 });
    }

    return new Response(res.body, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "no-cache",
      },
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
