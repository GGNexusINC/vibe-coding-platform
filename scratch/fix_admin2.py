import re
import os

filepath = 'src/app/admin/admin-panel-client.tsx'

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add import
if 'import { BotSection }' not in content:
    content = content.replace(
        'import { ActivityFeed } from "./activity-feed";',
        'import { ActivityFeed } from "./activity-feed";\nimport { BotSection } from "@/app/_components/bot-control/bot-section";'
    )

# 2. Add state
if 'const [guilds, setGuilds]' not in content:
    content = content.replace(
        'const [wipeAt, setWipeAt] = useState<string | null>(null);',
        'const [wipeAt, setWipeAt] = useState<string | null>(null);\n  const [guilds, setGuilds] = useState<{ id: string; name: string; icon: string | null }[]>([]);'
    )

# 3. Add fetch
if '/api/bot/guilds' not in content:
    fetch_code = """
  useEffect(() => {
    fetch("/api/bot/guilds", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        if (data?.ok) setGuilds(data.guilds ?? []);
      })
      .catch(() => {});
  }, []);
"""
    content = content.replace(
        'useEffect(() => {\n    void loadStats();\n  }, []);',
        'useEffect(() => {\n    void loadStats();\n  }, []);\n' + fetch_code
    )

# 4. Add to activeTab type
content = re.sub(
    r'(const \[activeTab, setActiveTab\] = useState<"dashboard" \| .*? \| "bot") \| "streamers"',
    r'\1 | "guild-configs" | "streamers"',
    content
)

# 5. Add to tabs
if 'id: "guild-configs"' not in content:
    content = re.sub(
        r'(\{ id: "bot"\s+as const, label: "Master Bot Control",icon: ".*?" \},)',
        r'\1\n    { id: "guild-configs" as const, label: "Guild Configs", icon: "⚙️" },',
        content
    )

# 6. Add tab content
if 'activeTab === "guild-configs"' not in content:
    tab_content = """
          {/* ════ GUILD CONFIGS ════ */}
          {activeTab === "guild-configs" && (
            <div className="grid min-w-0 max-w-full gap-4">
              <BotSection guilds={guilds} isAdminPanel={true} />
            </div>
          )}
"""
    content = content.replace(
        '{/* ════ STREAMERS ════ */}',
        tab_content + '\n          {/* ════ STREAMERS ════ */}'
    )

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print("Done")
