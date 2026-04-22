export type RequestDeviceInfo = {
  ip: string;
  ipChain: string;
  userAgent: string;
  os: string;
  browser: string;
  device: string;
  platform: string;
  architecture: string;
  bitness: string;
  mobile: string;
  model: string;
  cpu: string;
  gpu: string;
  language: string;
  languages: string;
  country: string;
  region: string;
  city: string;
  host: string;
  origin: string;
  referer: string;
};

function firstHeader(req: Request, names: string[]) {
  for (const name of names) {
    const value = req.headers.get(name);
    if (value) return value.trim();
  }
  return "";
}

function normalizeHint(value: string) {
  return value.replace(/^"|"$/g, "").trim() || "Unknown";
}

function detectOs(userAgent: string, platformHint: string) {
  const source = `${userAgent} ${platformHint}`.toLowerCase();
  if (source.includes("android")) return "Android";
  if (source.includes("iphone") || source.includes("ipad") || source.includes("ios")) return "iOS / iPadOS";
  if (source.includes("mac os") || source.includes("macintosh") || source.includes("macos")) return "macOS";
  if (source.includes("windows")) return "Windows";
  if (source.includes("cros")) return "ChromeOS";
  if (source.includes("linux")) return "Linux";
  if (source.includes("xbox")) return "Xbox";
  if (source.includes("playstation")) return "PlayStation";
  return platformHint || "Unknown";
}

function detectBrowser(userAgent: string) {
  const ua = userAgent.toLowerCase();
  if (!userAgent) return "Unknown";
  if (ua.includes("discordbot")) return "Discord Bot";
  if (ua.includes("edg/")) return "Microsoft Edge";
  if (ua.includes("opr/") || ua.includes("opera")) return "Opera";
  if (ua.includes("samsungbrowser")) return "Samsung Internet";
  if (ua.includes("firefox/")) return "Firefox";
  if (ua.includes("crios/")) return "Chrome iOS";
  if (ua.includes("chrome/")) return "Chrome";
  if (ua.includes("safari/")) return "Safari";
  return "Unknown";
}

function detectDevice(userAgent: string, mobileHint: string) {
  const ua = userAgent.toLowerCase();
  if (ua.includes("ipad") || ua.includes("tablet")) return "Tablet";
  if (mobileHint === "?1" || ua.includes("mobi") || ua.includes("android") || ua.includes("iphone")) {
    return "Mobile";
  }
  if (ua.includes("bot") || ua.includes("crawler") || ua.includes("spider")) return "Bot";
  if (ua.includes("xbox") || ua.includes("playstation")) return "Console";
  return "Desktop";
}

function truncate(value: string, max = 900) {
  if (value.length <= max) return value;
  return `${value.slice(0, max - 3)}...`;
}

export function inspectRequest(req: Request): RequestDeviceInfo {
  const forwardedFor = firstHeader(req, ["x-forwarded-for"]);
  const ip =
    firstHeader(req, ["cf-connecting-ip", "x-real-ip"]) ||
    forwardedFor.split(",")[0]?.trim() ||
    "Unknown";
  const userAgent = firstHeader(req, ["user-agent"]) || "Unknown";
  const platform = normalizeHint(firstHeader(req, ["sec-ch-ua-platform"]));
  const architecture = normalizeHint(firstHeader(req, ["sec-ch-ua-arch"]));
  const bitness = normalizeHint(firstHeader(req, ["sec-ch-ua-bitness"]));
  const mobileHint = firstHeader(req, ["sec-ch-ua-mobile"]);
  const model = normalizeHint(firstHeader(req, ["sec-ch-ua-model"]));
  const mobile = mobileHint === "?1" ? "Yes" : mobileHint === "?0" ? "No" : "Unknown";
  const os = detectOs(userAgent, platform === "Unknown" ? "" : platform);

  return {
    ip,
    ipChain: forwardedFor || ip,
    userAgent,
    os,
    browser: detectBrowser(userAgent),
    device: detectDevice(userAgent, mobileHint),
    platform,
    architecture,
    bitness,
    mobile,
    model,
    cpu:
      architecture !== "Unknown" || bitness !== "Unknown"
        ? `${architecture}${bitness !== "Unknown" ? ` / ${bitness}-bit` : ""}`
        : "Unknown",
    gpu: "Not available from HTTP headers",
    language: firstHeader(req, ["accept-language"]).split(",")[0]?.trim() || "Unknown",
    languages: firstHeader(req, ["accept-language"]) || "Unknown",
    country: firstHeader(req, ["x-vercel-ip-country", "cf-ipcountry"]) || "Unknown",
    region: firstHeader(req, ["x-vercel-ip-country-region", "cf-region"]) || "Unknown",
    city: firstHeader(req, ["x-vercel-ip-city", "cf-ipcity"]) || "Unknown",
    host: firstHeader(req, ["host"]) || "Unknown",
    origin: firstHeader(req, ["origin"]) || "Unknown",
    referer: firstHeader(req, ["referer"]) || "Unknown",
  };
}

export function requestInfoMetadata(info: RequestDeviceInfo, extra?: Record<string, unknown>) {
  return {
    ip: info.ip,
    ipChain: info.ipChain,
    os: info.os,
    browser: info.browser,
    device: info.device,
    platform: info.platform,
    architecture: info.architecture,
    bitness: info.bitness,
    mobile: info.mobile,
    model: info.model,
    cpu: info.cpu,
    gpu: info.gpu,
    language: info.language,
    languages: info.languages,
    country: info.country,
    region: info.region,
    city: info.city,
    host: info.host,
    origin: info.origin,
    referer: info.referer,
    userAgent: info.userAgent,
    timestamp: new Date().toISOString(),
    ...extra,
  };
}

export function requestInfoDiscordFields(info: RequestDeviceInfo) {
  return [
    { name: "IP", value: `\`${info.ip}\``, inline: true },
    { name: "Device", value: `${info.device} / ${info.os}`, inline: true },
    { name: "Browser", value: info.browser, inline: true },
    { name: "Platform", value: info.platform, inline: true },
    { name: "CPU / Arch", value: info.cpu, inline: true },
    { name: "GPU", value: info.gpu, inline: true },
    { name: "Mobile", value: info.mobile, inline: true },
    { name: "Model", value: info.model, inline: true },
    { name: "Locale", value: info.language, inline: true },
    {
      name: "Location",
      value: [info.region, info.country].filter((part) => part && part !== "Unknown").join(", ") || "Unknown",
      inline: true,
    },
    { name: "Host", value: `\`${truncate(info.host, 120)}\``, inline: true },
    { name: "Referer", value: `\`${truncate(info.referer, 220)}\``, inline: false },
    { name: "IP Chain", value: `\`${truncate(info.ipChain, 220)}\``, inline: false },
    { name: "User Agent", value: `\`${truncate(info.userAgent, 900)}\``, inline: false },
  ];
}

export function clientAuditDiscordFields(metadata?: Record<string, unknown>) {
  if (!metadata) return [];

  const value = (key: string, fallback = "Unknown") => {
    const raw = metadata[key];
    if (raw === null || raw === undefined || raw === "") return fallback;
    return String(raw);
  };
  const hasClientHardware =
    metadata.gpu ||
    metadata.browserGpu ||
    metadata.hardwareConcurrency ||
    metadata.deviceMemory ||
    metadata.screenWidth;

  if (!hasClientHardware) return [];

  return [
    { name: "Client GPU", value: value("browserGpu", value("gpu")), inline: false },
    { name: "GPU Vendor", value: value("browserGpuVendor", value("gpuVendor")), inline: true },
    { name: "CPU Cores", value: value("hardwareConcurrency"), inline: true },
    {
      name: "Device Memory",
      value: metadata.deviceMemory ? `${metadata.deviceMemory} GB` : "Unknown",
      inline: true,
    },
    {
      name: "Screen",
      value: `${value("screenWidth", "?")}x${value("screenHeight", "?")} @ ${value("devicePixelRatio", "?")} DPR`,
      inline: true,
    },
    { name: "Timezone", value: value("timezone"), inline: true },
    { name: "Connection", value: `${value("effectiveType")} / ${value("downlink", "?")} Mbps`, inline: true },
  ];
}
