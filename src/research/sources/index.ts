import type { SourceAdapter } from "../types.js";
import { githubSource } from "./github.js";
import { youtubeSource } from "./youtube.js";
import { stackExchangeSource } from "./stackexchange.js";
import { hackerNewsSource } from "./hackernews.js";
import { rssSource } from "./rss.js";
import { redditSource } from "./reddit.js";

export const ALL_SOURCE_ADAPTERS: SourceAdapter[] = [
  githubSource,
  youtubeSource,
  stackExchangeSource,
  hackerNewsSource,
  rssSource,
  redditSource,
];

export { githubSource, youtubeSource, stackExchangeSource, hackerNewsSource, rssSource, redditSource };
