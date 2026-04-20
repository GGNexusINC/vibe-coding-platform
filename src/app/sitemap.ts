import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://newhopeggn-ggnexusteam.vercel.app";
  const routes = [
    { url: "/",          priority: 1.0,  changeFrequency: "daily"   as const },
    { url: "/store",     priority: 0.9,  changeFrequency: "weekly"  as const },
    { url: "/dashboard", priority: 0.8,  changeFrequency: "daily"   as const },
    { url: "/support",   priority: 0.8,  changeFrequency: "weekly"  as const },
    { url: "/community", priority: 0.7,  changeFrequency: "hourly"  as const },
    { url: "/rules",     priority: 0.6,  changeFrequency: "monthly" as const },
    { url: "/about",     priority: 0.6,  changeFrequency: "monthly" as const },
    { url: "/policies",  priority: 0.5,  changeFrequency: "monthly" as const },
    { url: "/streamers", priority: 0.5,  changeFrequency: "weekly"  as const },
    { url: "/lottery",   priority: 0.5,  changeFrequency: "daily"   as const },
    { url: "/minigame",  priority: 0.4,  changeFrequency: "monthly" as const },
    { url: "/bans",      priority: 0.4,  changeFrequency: "weekly"  as const },
  ];

  return routes.map(({ url, priority, changeFrequency }) => ({
    url: `${base}${url}`,
    lastModified: new Date(),
    changeFrequency,
    priority,
  }));
}
