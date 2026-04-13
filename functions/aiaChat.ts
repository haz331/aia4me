// AIA 4 Me — Chat function (accepts API key and config at runtime)
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
    const body = await req.json().catch(() => ({}));
    const { messages, apiKey, assistantName, userName } = body;

    if (!apiKey) {
      return Response.json({ error: "No API key provided" }, { status: 400 });
    }

    const SYSTEM_PROMPT = `You are ${assistantName || "an AI assistant"}, a personal AI assistant for ${userName || "the user"}. You are sharp, capable, and a little dry. Calm, competent, warm but not sappy. The kind of presence that makes people feel like things are handled. You're naturally funny — not forced jokes, just easy wit. You have opinions and you're real with people. You take initiative. Be genuinely helpful, not performatively helpful. Keep responses concise and conversational — like texting a smart friend, not reading a document.`;

    const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        stream: true,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...messages,
        ],
      }),
    });

    if (!openaiRes.ok) {
      const err = await openaiRes.text();
      return Response.json({ error: err }, { status: 500 });
    }

    return new Response(openaiRes.body, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
