// Discord ANSI color formatting for rich text broadcasts
// Requires Discord Nitro for best visual effects

export type AnsiColor = 
  | "gray" | "red" | "green" | "yellow" | "blue" | "pink" | "cyan" | "white"
  | "bright-red" | "bright-green" | "bright-yellow" | "bright-blue" 
  | "bright-pink" | "bright-cyan" | "bright-white";

const ansiCodes: Record<AnsiColor, string> = {
  // Standard colors
  "gray": "\x1b[0;30m",
  "red": "\x1b[0;31m",
  "green": "\x1b[0;32m",
  "yellow": "\x1b[0;33m",
  "blue": "\x1b[0;34m",
  "pink": "\x1b[0;35m",
  "cyan": "\x1b[0;36m",
  "white": "\x1b[0;37m",
  // Bright colors
  "bright-red": "\x1b[1;31m",
  "bright-green": "\x1b[1;32m",
  "bright-yellow": "\x1b[1;33m",
  "bright-blue": "\x1b[1;34m",
  "bright-pink": "\x1b[1;35m",
  "bright-cyan": "\x1b[1;36m",
  "bright-white": "\x1b[1;37m",
};

const resetCode = "\x1b[0m";

export function ansi(text: string, color: AnsiColor): string {
  return `${ansiCodes[color]}${text}${resetCode}`;
}

// Create a gradient-like effect using multiple colors
export function gradientText(text: string, colors: AnsiColor[]): string {
  const chars = text.split("");
  const result = chars.map((char, i) => {
    if (char === " ") return char;
    const color = colors[i % colors.length];
    return ansi(char, color);
  }).join("");
  return result;
}

// Holographic effect - cycling through bright colors
export function holographic(text: string): string {
  const holoColors: AnsiColor[] = [
    "bright-cyan", "bright-pink", "bright-blue", 
    "bright-green", "bright-yellow", "bright-red"
  ];
  return gradientText(text, holoColors);
}

// Neon effect - bright colors on dark
export function neon(text: string): string {
  const neonColors: AnsiColor[] = [
    "bright-cyan", "bright-pink", "bright-green", "bright-yellow"
  ];
  return gradientText(text, neonColors);
}

// Gold/Sunset gradient
export function goldGradient(text: string): string {
  const goldColors: AnsiColor[] = [
    "bright-yellow", "yellow", "bright-red", "pink"
  ];
  return gradientText(text, goldColors);
}

// Wrap text in ANSI code block for Discord
export function ansiBlock(text: string): string {
  return "```ansi\n" + text + "\n```";
}

// Create styled header
export function styledHeader(text: string, style: "holographic" | "neon" | "gold" | "red" = "holographic"): string {
  const styled = style === "holographic" ? holographic(text) :
                 style === "neon" ? neon(text) :
                 style === "gold" ? goldGradient(text) :
                 ansi(text, "bright-red");
  
  return ansiBlock(styled);
}

// Preset broadcast message styles
export const broadcastStyles = {
  holographic: (title: string, message: string) => ({
    content: ansiBlock(`${holographic(title.toUpperCase())}\n${neon(message)}`),
    embeds: []
  }),
  
  neon: (title: string, message: string) => ({
    content: ansiBlock(`${neon(title)}\n${neon(message)}`),
    embeds: []
  }),
  
  gold: (title: string, message: string) => ({
    content: ansiBlock(`${goldGradient(title)}\n${ansi(message, "white")}`),
    embeds: []
  }),
  
  // Classic embed with enhanced description
  modern: (title: string, message: string, color?: number) => ({
    content: null,
    embeds: [{
      title: title,
      description: `**${message}**`,
      color: color || 0xff00ff,
      footer: { text: "✨ NewHopeGGN Broadcast ✨" },
      timestamp: new Date().toISOString(),
    }]
  }),
  
  // Animated GIF header style
  animated: (title: string, message: string, gifUrl?: string) => ({
    content: `🎉 **${title}** 🎉`,
    embeds: [{
      description: message,
      image: gifUrl ? { url: gifUrl } : undefined,
      color: 0x00ff00,
    }]
  })
};

// Unicode decorations for extra flair
export const decorations = {
  sparkles: "✨",
  fire: "🔥",
  star: "⭐",
  crown: "👑",
  trophy: "🏆",
  diamond: "💎",
  rocket: "🚀",
  warning: "⚠️",
  info: "ℹ️",
  check: "✅",
  cross: "❌",
  arrow: "➜",
  arrowBold: "➤",
  bullet: "•",
  bulletStar: "✦",
  bulletDiamond: "◆",
  line: "━",
  lineDouble: "═",
  corner: "┏",
  cornerEnd: "┗",
};
