const fs = require('fs');
const path = require('path');
const p = path.resolve('src/app/admin/admin-panel-client.tsx');
let content = fs.readFileSync(p, 'utf8');

// 1. Remove BotSection import
content = content.replace('import { BotSection } from "@/app/_components/bot-control/bot-section";\n', '');

// 2. Remove fetch guilds
content = content.replace(/  const \[guilds, setGuilds\] = useState<\{.*?\}\[\]>\(\[\]\);\r?\n/, '');
content = content.replace(/    fetch\("\/api\/bot\/guilds", \{ cache: "no-store" \}\)\r?\n      \.then\(\(res\) => res\.json\(\)\)\r?\n      \.then\(\(data\) => \{\r?\n        if \(data\?\.ok\) setGuilds\(data\.guilds \?\? \[\]\);\r?\n      \}\)\r?\n      \.catch\(\(\) => \{\}\);\r?\n\r?\n/, '');

// 3. Find bot-status div
const botStatusStart = content.indexOf('<div id="bot-status"');
const wipeTimerStart = content.indexOf('{/* Wipe Timer Status — live ticking */}');

// The end of bot-status is right before the Wipe Timer
let botStatusHtml = content.substring(botStatusStart, wipeTimerStart);

// Let's trim right to remove trailing whitespace before the comment
botStatusHtml = botStatusHtml.replace(/\s+$/, '') + '\n';

// Remove it from its original place
content = content.replace(content.substring(botStatusStart, wipeTimerStart), '');

// Replace the `<BotSection ...>` placeholder with it
content = content.replace(/<BotSection guilds=\{guilds\} isAdminPanel=\{true\} \/>/, botStatusHtml);

// 4. Rename tab label
content = content.replace('label: "Bot Control"', 'label: "Master Bot Control"');

fs.writeFileSync(p, content);
console.log("Done");
