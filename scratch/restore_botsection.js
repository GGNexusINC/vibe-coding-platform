const fs = require('fs');
const path = require('path');
const p = path.resolve('src/app/admin/admin-panel-client.tsx');
let content = fs.readFileSync(p, 'utf8');

// 1. Add import
if (!content.includes('BotSection')) {
  content = content.replace(
    'import { ErrorBoundary } from "react-error-boundary";',
    'import { ErrorBoundary } from "react-error-boundary";\nimport { BotSection } from "@/app/_components/bot-control/bot-section";'
  );
}

// 2. Add guilds state
if (!content.includes('const [guilds, setGuilds]')) {
  content = content.replace(
    'const [session, setSession] = useState<Session | null>(null);',
    'const [session, setSession] = useState<Session | null>(null);\n  const [guilds, setGuilds] = useState<{ id: string; name: string; icon: string | null }[]>([]);'
  );
}

// 3. Add fetch guilds
if (!content.includes('/api/bot/guilds')) {
  content = content.replace(
    'fetch("/api/admin/bot-premium")',
    'fetch("/api/bot/guilds", { cache: "no-store" })\n      .then((res) => res.json())\n      .then((data) => { if (data?.ok) setGuilds(data.guilds ?? []); })\n      .catch(() => {});\n\n    fetch("/api/admin/bot-premium")'
  );
}

// 4. Add tab definition
if (!content.includes('id: "guild-configs"')) {
  content = content.replace(
    '{ id: "bot"       as const, label: "Master Bot Control"',
    '{ id: "bot"       as const, label: "Master Bot Control",icon: "🤖" },\n    { id: "guild-configs" as const, label: "Guild Configs", icon: "⚙️" } // placeholder\n    // { id: "bot" as const, label: "Master Bot Control"'
  );
  content = content.replace(
    '// { id: "bot" as const, label: "Master Bot Control"',
    ''
  );
  // wait, the regex might be simpler
  content = content.replace(
    /\{ id: "bot"\s+as const, label: "Master Bot Control",\s*icon: ".*?" \},/,
    '{ id: "bot"       as const, label: "Master Bot Control",icon: "🤖" },\n    { id: "guild-configs" as const, label: "Guild Configs",   icon: "⚙️" },'
  );
  
  // Also add type to activeTab
  content = content.replace(
    '| "bot"',
    '| "bot" | "guild-configs"'
  );
}

// 5. Add rendering block
if (!content.includes('activeTab === "guild-configs"')) {
  const renderingBlock = `
          {/* ════ GUILD CONFIGS ════ */}
          {activeTab === "guild-configs" && (
            <div className="grid min-w-0 max-w-full gap-4">
              <BotSection guilds={guilds} isAdminPanel={true} />
            </div>
          )}
  `;
  content = content.replace(
    '{/* ════ BETA TESTER REQUESTS ════ */}',
    renderingBlock + '\n          {/* ════ BETA TESTER REQUESTS ════ */}'
  );
}

fs.writeFileSync(p, content);
console.log("Done");
