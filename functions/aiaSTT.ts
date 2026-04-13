// AIA 4 Me — Speech to text (accepts API key at runtime)
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
    const formData = await req.formData();
    const audioFile = formData.get("audio");
    const apiKey = formData.get("apiKey");

    if (!audioFile) return Response.json({ error: "No audio file provided" }, { status: 400 });
    if (!apiKey) return Response.json({ error: "No API key provided" }, { status: 400 });

    const whisperForm = new FormData();
    whisperForm.append("file", audioFile, "recording.webm");
    whisperForm.append("model", "whisper-1");

    const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${apiKey}` },
      body: whisperForm,
    });

    if (!res.ok) {
      const err = await res.text();
      return Response.json({ error: err }, { status: 500 });
    }

    const data = await res.json();
    return Response.json({ text: data.text }, {
      headers: { "Access-Control-Allow-Origin": "*" }
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
