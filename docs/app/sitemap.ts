import type { MetadataRoute } from "next";
import { flattenNavItems, navigation } from "@/lib/navigation";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://docs.roset.dev";
  const pages = flattenNavItems(navigation);

  return [
    {
      url: baseUrl + "/docs",
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
    ...pages.map((page) => ({
      url: baseUrl + page.href,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
  ];
}
