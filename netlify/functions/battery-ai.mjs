const headers = { "Content-Type": "application/json; charset=utf-8" };

export default async (request) => {
  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "POST required" }), { status: 405, headers });
  }
  try {
    const key = Netlify.env.get("OPENAI_API_KEY");
    if (!key) throw new Error("AI_NOT_CONFIGURED");

    const data = await request.json();
    const vehicle = {
      make: String(data.make || "").slice(0, 100),
      model: String(data.model || "").slice(0, 100),
      year: String(data.year || "").slice(0, 10),
      engine: String(data.engine || "").slice(0, 80),
      fuel: String(data.fuel || "").slice(0, 40),
      modelCode: String(data.modelCode || "").slice(0, 60)
    };
    if (!vehicle.make || !vehicle.model || !vehicle.year) {
      return new Response(JSON.stringify({ error: "MISSING_VEHICLE" }), { status: 400, headers });
    }

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + key,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4.1",
        tools: [{ type: "web_search_preview" }],
        instructions: "You are an automotive battery fitment researcher. Search reliable manufacturer documentation for the exact vehicle variant. Never invent specifications. Distinguish original OEM battery from compatible replacements. Return only JSON with fields battery (string or null, e.g. 65Ah EFB), confidence (verified, possible, unknown), source_url (string or null), explanation (short Hebrew string). If minimum Ah or battery technology cannot be verified, battery must be null. A single product listing without exact vehicle fitment is insufficient.",
        input: JSON.stringify(vehicle),
        max_output_tokens: 650
      })
    });

    const result = await response.json();
    if (!response.ok) throw new Error("OPENAI_REQUEST_FAILED");

    const output = (result.output || [])
      .filter(x => x.type === "message")
      .flatMap(x => x.content || [])
      .filter(x => x.type === "output_text")
      .map(x => x.text)
      .join("");

    let parsed;
    try {
      parsed = JSON.parse(output.replace(/^```json\s*|\s*```$/g, ""));
    } catch {
      parsed = { battery: null, confidence: "unknown", source_url: null, explanation: "לא התקבלה תשובה ניתנת לאימות" };
    }

    return new Response(JSON.stringify(parsed), { headers });
  } catch (error) {
    return new Response(JSON.stringify({
      battery: null,
      confidence: "unknown",
      explanation: error.message === "AI_NOT_CONFIGURED" ? "יש להגדיר מפתח API ב-Netlify" : "שירות החיפוש אינו זמין כרגע"
    }), { status: 503, headers });
  }
};

export const config = { path: "/api/battery-ai" };
