const fs = require('fs');
const path = require('path');
const p = path.resolve('src/app/admin/admin-panel-client.tsx');
let content = fs.readFileSync(p, 'utf8');

// 1. Add import
if (!content.includes('import { BotSection }')) {
    content = content.replace(
        'import { ActivityFeed } from "./activity-feed";',
        'import { ActivityFeed } from "./activity-feed";\nimport { BotSection } from "@/app/_components/bot-control/bot-section";'
    );
}

// 2. Add state
if (!content.includes('const [guilds, setGuilds]')) {
    content = content.replace(
        'const [wipeAt, setWipeAt] = useState<string | null>(null);',
        'const [wipeAt, setWipeAt] = useState<string | null>(null);\n  const [guilds, setGuilds] = useState<{ id: string; name: string; icon: string | null }[]>([]);'
    );
}

// 3. Add fetch
if (!content.includes('/api/bot/guilds')) {
    const fetch_code = `
  useEffect(() => {
    fetch("/api/bot/guilds", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        if (data?.ok) setGuilds(data.guilds ?? []);
      })
      .catch(() => {});
  }, []);
`;
    content = content.replace(
        'useEffect(() => {\n    void loadStats();\n  }, []);',
        'useEffect(() => {\n    void loadStats();\n  }, []);\n' + fetch_code
    );
}

// 4. Add to activeTab type
content = content.replace(
    /(const \[activeTab, setActiveTab\] = useState<"dashboard" \| .*? \| "bot") \| "streamers"/,
    '$1 | "guild-configs" | "streamers"'
);

// 5. Add to tabs
if (!content.includes('id: "guild-configs"')) {
    content = content.replace(
        /(\{ id: "bot"\s+as const, label: "Master Bot Control",icon: ".*?" \},)/,
        '$1\n    { id: "guild-configs" as const, label: "Guild Configs", icon: "⚙️" },'
    );
}

// 6. Add tab content
if (!content.includes('activeTab === "guild-configs"')) {
    const tab_content = `
          {/* ════ GUILD CONFIGS ════ */}
          {activeTab === "guild-configs" && (
            <div className="grid min-w-0 max-w-full gap-4">
              <BotSection guilds={guilds} isAdminPanel={true} />
            </div>
          )}
`;
    content = content.replace(
        '{/* ════ STREAMERS ════ */}',
        tab_content + '\n          {/* ════ STREAMERS ════ */}'
    );
}

fs.writeFileSync(p, content);
console.log("Done");
