const fs = require('fs');
const path = require('path');
const p = path.resolve('src/app/admin/admin-panel-client.tsx');
let content = fs.readFileSync(p, 'utf8');

// Add state
if (!content.includes('const [guilds, setGuilds]')) {
    content = content.replace(
        'const [wipeAt, setWipeAt] = useState("");',
        'const [wipeAt, setWipeAt] = useState("");\n  const [guilds, setGuilds] = useState<{ id: string; name: string; icon: string | null }[]>([]);'
    );
}

// Add fetch
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
        '  useEffect(() => {\n    void loadStats();\n  }, [loadStats]);',
        '  useEffect(() => {\n    void loadStats();\n  }, [loadStats]);\n' + fetch_code
    );
}

fs.writeFileSync(p, content);
console.log("Done");
