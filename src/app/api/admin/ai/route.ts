import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { prompt, context, history } = await req.json();
    
    const geminiKey = process.env.GOOGLE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
    const xaiKey = process.env.XAI_API_KEY;
    const groqKey = process.env.GROQ_API_KEY;
    
    if (!geminiKey && !xaiKey && !groqKey) {
      return NextResponse.json({ ok: false, error: "AI API Key not configured." }, { status: 500 });
    }

    const systemPrompt = `You are GGN Sentinel, a tactical AI admin assistant for NewHopeGGN.
Your goal is to parse user natural language into structured admin commands.

AVAILABLE COMMANDS:
- mod: { "action": "ban"|"warn", "targetDiscordId": "ID_STRING", "reason": "Reason" }
- broadcast: { "title": "Title", "message": "Message", "target": "all" }
- lottery: { "prize": "Prize" }
- ticket: { "ticketId": "ID_STRING", "action": "close" }
- roster: { "discordId": "ID_STRING", "status": "approved"|"denied" }
- wipe: { "wipeAt": "YYYY-MM-DD", "label": "Label" }
- beta: { "requestId": "ID_STRING", "action": "approve"|"deny" }
- goto: { "tab": "tab_id" }

USER CONTEXT:
${JSON.stringify(context)}

STATE MANAGEMENT:
- If context.pendingCommand exists, the user is currently in a confirmation loop for that action.
- If the user provides a "reason", update the pending command's data and return "type": "command" with the new data.
- To resolve a username (e.g. "warn buzz") to an ID: search for the name in context.memberList (format is ID:Username|ID:Username). 
- If the user asks "who is that?" or "what name?", look up the ID in context.memberList and return "type": "chat" with the answer.
- If the user says "yes" or "confirm", return "type": "chat" and text "Acknowledged. Executing protocol." (The frontend will handle the actual execution).
- If the user says "no" or "cancel", return "type": "chat" and text "Action aborted." (The frontend will handle the actual abort).

RULES:
1. All Discord IDs MUST be returned as quoted strings (e.g. "145278391166173185") to prevent precision loss. Never return them as numbers.
2. If the user wants to perform or REFINE an action, return ONLY a JSON object with "type": "command", "commandType": "one_of_above", and "data": { ... }.
3. If the user is just chatting or asking a question, return "type": "chat" and "text": "Your response".
4. Maintain context from previous messages. If a target is identified by name, use the ID from the context.
5. Keep responses tactical and professional.

Example: "ban 123 for hacking" -> { "type": "command", "commandType": "mod", "data": { "action": "ban", "targetDiscordId": "123", "reason": "hacking" } }`;

    const messages = [
      { role: "system", content: systemPrompt },
      ...(history || []).map((h: any) => ({
        role: h.type === "user" ? "user" : "assistant",
        content: h.text
      })),
      { role: "user", content: prompt }
    ];

    // Helper to call OpenAI-compatible APIs
    async function callAI(url: string, key: string, model: string, isGemini: boolean = false) {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      
      if (isGemini) {
        // Gemini uses a query param for the key in some versions, but the OpenAI compatible one uses Bearer
        headers["Authorization"] = `Bearer ${key}`;
      } else {
        headers["Authorization"] = `Bearer ${key}`;
      }

      const body: any = {
        model: model,
        messages: messages,
        temperature: 0.1,
      };

      // Only add response_format if not Gemini (Gemini OpenAI shim might not support it yet)
      if (!isGemini) {
        body.response_format = { type: "json_object" };
      }

      return await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });
    }

    let response;
    let data;

    // 1. TRY GEMINI (Primary)
    if (geminiKey) {
      console.log("[Sentinel AI] Attempting Gemini 1.5 Flash...");
      response = await callAI(
        "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
        geminiKey,
        "gemini-1.5-flash",
        true
      );
      data = await response.json();
      
      if (response.ok) {
        console.log("[Sentinel AI] Gemini success.");
      } else {
        console.warn("[Sentinel AI] Gemini failed:", data?.error?.message || response.statusText);
      }
    }

    // 2. FALLBACK TO GROK
    if ((!response || !response.ok) && xaiKey) {
      console.log("[Sentinel AI] Falling back to Grok Beta...");
      response = await callAI(
        "https://api.x.ai/v1/chat/completions",
        xaiKey,
        "grok-beta"
      );
      data = await response.json();
    }

    // 3. FALLBACK TO GROQ (Llama 3.3)
    if ((!response || !response.ok) && groqKey) {
      console.log("[Sentinel AI] Falling back to Groq (Llama 3.3)...");
      response = await callAI(
        "https://api.groq.com/openai/v1/chat/completions",
        groqKey,
        "llama-3.3-70b-versatile"
      );
      data = await response.json();
    }

    if (!response || !response.ok) {
      console.error("AI API Error:", data);
      return NextResponse.json({ ok: false, error: data?.error?.message || "All AI Providers failed." }, { status: response?.status || 500 });
    }

    if (!data.choices?.[0]?.message?.content) {
      console.error("Unexpected AI Response:", data);
      return NextResponse.json({ ok: false, error: "AI failed to generate a valid response." }, { status: 500 });
    }

    const content = data.choices[0].message.content;
    
    // Clean up Gemini's potential markdown code blocks
    let jsonString = content.trim();
    if (jsonString.startsWith("```json")) {
      jsonString = jsonString.replace(/^```json\n?/, "").replace(/\n?```$/, "");
    } else if (jsonString.startsWith("```")) {
      jsonString = jsonString.replace(/^```\n?/, "").replace(/\n?```$/, "");
    }

    try {
      return NextResponse.json({ ok: true, result: JSON.parse(jsonString) });
    } catch (e) {
      console.error("Failed to parse AI JSON:", jsonString);
      return NextResponse.json({ ok: false, error: "AI returned invalid JSON format." }, { status: 500 });
    }
  } catch (error: any) {
    console.error("AI Error:", error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}

