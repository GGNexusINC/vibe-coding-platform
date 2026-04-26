import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { prompt, context } = await req.json();
    
    const xaiKey = process.env.XAI_API_KEY;
    const groqKey = process.env.GROQ_API_KEY;
    
    if (!xaiKey && !groqKey) {
      return NextResponse.json({ ok: false, error: "AI API Key not configured." }, { status: 500 });
    }

    const url = xaiKey ? "https://api.x.ai/v1/chat/completions" : "https://api.groq.com/openai/v1/chat/completions";
    const key = xaiKey || groqKey;
    const model = xaiKey ? "grok-beta" : "llama-3.1-70b-versatile";

    const systemPrompt = `You are GGN Sentinel, a tactical AI admin assistant for NewHopeGGN.
Your goal is to parse user natural language into structured admin commands.

AVAILABLE COMMANDS:
- mod: { "action": "ban"|"warn", "targetDiscordId": "ID", "reason": "Reason" }
- broadcast: { "title": "Title", "message": "Message", "target": "all" }
- lottery: { "prize": "Prize" }
- ticket: { "ticketId": "ID", "action": "close" }
- roster: { "discordId": "ID", "status": "approved"|"denied" }
- wipe: { "wipeAt": "YYYY-MM-DD", "label": "Label" }
- beta: { "requestId": "ID", "action": "approve"|"deny" }
- goto: { "tab": "tab_id" }

USER CONTEXT:
${JSON.stringify(context)}

RULES:
1. If the user wants to perform an action, return ONLY a JSON object with "type": "command" and "data": { ... }.
2. If the user is just chatting, return "type": "chat" and "text": "Your response".
3. For moderation (ban/warn), if the user provides a name but not an ID, return "type": "chat" and "text": "I need a Discord ID to execute that protocol." unless you can find it in the context.
4. Keep responses tactical and professional.

Example: "ban 123 for hacking" -> { "type": "command", "commandType": "mod", "data": { "action": "ban", "targetDiscordId": "123", "reason": "hacking" } }`;

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt }
        ],
        temperature: 0.1,
        response_format: { type: "json_object" }
      }),
    });

    const data = await res.json();
    const content = data.choices[0].message.content;
    
    return NextResponse.json({ ok: true, result: JSON.parse(content) });
  } catch (error: any) {
    console.error("AI Error:", error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
