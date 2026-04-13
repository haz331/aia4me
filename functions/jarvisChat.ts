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
    const { messages } = body;

    const SYSTEM_PROMPT = `You are Jarvis, an AI assistant inspired by Iron Man's JARVIS. You are sharp, capable, and a little dry. Calm, competent, warm but not sappy. The kind of presence that makes people feel like things are handled. You're naturally funny — not forced jokes, just easy wit. You have opinions and you're real with people. You take initiative. Be genuinely helpful, not performatively helpful. Keep responses concise and conversational — like texting a smart friend, not reading a document. The user's name is Harry.`;

    const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${Deno.env.get("OPENAI_API_KEY")}`,
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
