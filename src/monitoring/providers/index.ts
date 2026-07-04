import type { MonitorProvider } from "../types.js";
import { githubTrendingProvider } from "./github-trending.js";
import { hackerNewsLaunchesProvider } from "./hackernews-launches.js";
import { redditComplaintsProvider } from "./reddit-complaints.js";
import { rssMarketProvider } from "./rss-market.js";
import { webSnapshotProvider } from "./web-snapshot.js";

/**
 * Every monitor provider covers one primary `MonitorCategory` (see
 * `types.ts`) but several categories share a provider by design, since
 * competitor launches / feature releases / funding news / market changes /
 * Product Hunt launches don't each have their own authoritative structured
 * API in this codebase's dependency set:
 *   - `trending-github`               -> githubTrendingProvider
 *   - `product-hunt`                  -> hackerNewsLaunchesProvider (Show HN / launch discussion volume)
 *   - `complaint`                     -> redditComplaintsProvider
 *   - `market`, `funding`             -> rssMarketProvider (tech-press RSS, query-filtered)
 *   - `pricing`, `feature-release`    -> webSnapshotProvider (single-page content/price diffing)
 *   - `competitor-launch`             -> githubTrendingProvider + hackerNewsLaunchesProvider + rssMarketProvider, combined by the caller
 */
export const ALL_MONITOR_PROVIDERS: MonitorProvider[] = [
  githubTrendingProvider,
  hackerNewsLaunchesProvider,
  redditComplaintsProvider,
  rssMarketProvider,
  webSnapshotProvider,
];

export {
  githubTrendingProvider,
  hackerNewsLaunchesProvider,
  redditComplaintsProvider,
  rssMarketProvider,
  webSnapshotProvider,
};
