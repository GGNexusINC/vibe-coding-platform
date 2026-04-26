import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { prompt, context, history } = await req.json();
    
    const xaiKey = process.env.XAI_API_KEY;
    const groqKey = process.env.GROQ_API_KEY;
    
    if (!xaiKey && !groqKey) {
      return NextResponse.json({ ok: false, error: "AI API Key not configured." }, { status: 500 });
    }

    const url = xaiKey ? "https://api.x.ai/v1/chat/completions" : "https://api.groq.com/openai/v1/chat/completions";
    const key = xaiKey || groqKey;
    const model = xaiKey ? "grok-beta" : "llama-3.3-70b-versatile";

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
- If the user asks "who is that?" or "what name?", look up the ID in context.members and return "type": "chat" with the answer.
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

    let res = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: model,
        messages: messages,
        temperature: 0.1,
        response_format: { type: "json_object" }
      }),
    });

    let data = await res.json();
    
    // FALLBACK FOR GROQ RATE LIMIT
    if (!res.ok && data?.error?.code === "rate_limit_exceeded" && !xaiKey) {
      console.warn("[Sentinel AI] Groq rate limit hit. Falling back to llama-3.1-8b-instant...");
      res = await fetch(url, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "llama-3.1-8b-instant",
          messages: messages,
          temperature: 0.1,
          response_format: { type: "json_object" }
        }),
      });
      data = await res.json();
    }

    if (!res.ok) {
      console.error("AI API Error:", data);
      return NextResponse.json({ ok: false, error: data?.error?.message || "AI Provider Error" }, { status: res.status });
    }

    if (!data.choices?.[0]?.message?.content) {
      console.error("Unexpected AI Response:", data);
      return NextResponse.json({ ok: false, error: "AI failed to generate a valid response." }, { status: 500 });
    }

    const content = data.choices[0].message.content;
    return NextResponse.json({ ok: true, result: JSON.parse(content) });
  } catch (error: any) {
    console.error("AI Error:", error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
