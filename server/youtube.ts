import { YouTubeVideo } from "../src/types";

// In-memory cache for YouTube API queries to preserve quota and speed up responses
const youtubeCache = new Map<string, { videos: YouTubeVideo[]; timestamp: number }>();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

// Helper to decode standard HTML entities from YouTube API snippet titles
function decodeHtmlEntities(str: string): string {
  if (!str) return "";
  return str
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)));
}

// Convert ISO 8601 duration (e.g. PT15M33S, PT1H2M10S) to human readable format (e.g. 15:33, 1:02:10)
function parseISO8601Duration(isoDuration?: string): string | undefined {
  if (!isoDuration) return undefined;
  const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return undefined;

  const hours = parseInt(match[1] || '0', 10);
  const minutes = parseInt(match[2] || '0', 10);
  const seconds = parseInt(match[3] || '0', 10);

  const formattedSeconds = seconds.toString().padStart(2, '0');

  if (hours > 0) {
    const formattedMinutes = minutes.toString().padStart(2, '0');
    return `${hours}:${formattedMinutes}:${formattedSeconds}`;
  }
  return `${minutes}:${formattedSeconds}`;
}

/**
 * Builds the fallback YouTube search link for any given query.
 */
export function buildFallbackYouTubeSearchUrl(query: string): string {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
}

/**
 * Fetch video durations for a list of video IDs using YouTube Data API v3 videos endpoint.
 */
async function fetchVideoDurations(apiKey: string, videoIds: string[]): Promise<Map<string, string>> {
  const durationMap = new Map<string, string>();
  if (videoIds.length === 0) return durationMap;

  try {
    const url = new URL("https://www.googleapis.com/youtube/v3/videos");
    url.searchParams.set("part", "contentDetails");
    url.searchParams.set("id", videoIds.join(","));
    url.searchParams.set("key", apiKey);

    const res = await fetch(url.toString(), {
      headers: { "Accept": "application/json" }
    });

    if (!res.ok) return durationMap;

    const data: any = await res.json();
    if (Array.isArray(data.items)) {
      for (const item of data.items) {
        const id = item.id;
        const rawDuration = item.contentDetails?.duration;
        const humanDuration = parseISO8601Duration(rawDuration);
        if (id && humanDuration) {
          durationMap.set(id, humanDuration);
        }
      }
    }
  } catch (err) {
    console.warn("[YouTube API] Notice: Could not fetch video durations:", err);
  }

  return durationMap;
}

/**
 * Searches YouTube for educational video tutorials matching the learning step.
 * Returns 2-3 genuine YouTube videos when the API key is active.
 * Returns an empty array if API key is not configured or quota limit is reached.
 */
export async function searchYouTubeTutorials(
  skillName: string,
  stepTitle: string,
  topics: string[] = [],
  maxResults: number = 3
): Promise<{ videos: YouTubeVideo[]; fallbackSearchUrl: string }> {
  // Construct a targeted educational query
  const primaryTopics = topics.slice(0, 2).join(" ");
  const searchQuery = `${skillName} ${stepTitle} ${primaryTopics} tutorial`.trim();
  const fallbackSearchUrl = buildFallbackYouTubeSearchUrl(searchQuery);

  const apiKey = process.env.YOUTUBE_API_KEY?.trim();

  // If no API key configured, return clean fallback
  if (!apiKey) {
    return { videos: [], fallbackSearchUrl };
  }

  // Check cache first
  const cacheKey = searchQuery.toLowerCase();
  const cached = youtubeCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return { videos: cached.videos, fallbackSearchUrl };
  }

  try {
    const searchUrl = new URL("https://www.googleapis.com/youtube/v3/search");
    searchUrl.searchParams.set("part", "snippet");
    searchUrl.searchParams.set("q", searchQuery);
    searchUrl.searchParams.set("type", "video");
    searchUrl.searchParams.set("maxResults", Math.max(2, Math.min(maxResults, 5)).toString());
    searchUrl.searchParams.set("order", "relevance");
    searchUrl.searchParams.set("relevanceLanguage", "en");
    searchUrl.searchParams.set("safeSearch", "moderate");
    searchUrl.searchParams.set("key", apiKey);

    const response = await fetch(searchUrl.toString(), {
      headers: { "Accept": "application/json" }
    });

    if (!response.ok) {
      const errText = await response.text();
      console.warn(`[YouTube API Error] Status ${response.status}: ${errText.slice(0, 200)}`);
      return { videos: [], fallbackSearchUrl };
    }

    const data: any = await response.json();
    if (!data.items || !Array.isArray(data.items)) {
      return { videos: [], fallbackSearchUrl };
    }

    const videoIds: string[] = [];
    const rawVideos: any[] = [];

    for (const item of data.items) {
      const videoId = item.id?.videoId;
      if (videoId) {
        videoIds.push(videoId);
        rawVideos.push(item);
      }
    }

    // Attempt to enrich with durations
    const durations = await fetchVideoDurations(apiKey, videoIds);

    const videos: YouTubeVideo[] = rawVideos.map(item => {
      const videoId = item.id.videoId;
      const snippet = item.snippet || {};
      const thumbnail =
        snippet.thumbnails?.medium?.url ||
        snippet.thumbnails?.high?.url ||
        snippet.thumbnails?.default?.url ||
        `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;

      return {
        videoId,
        title: decodeHtmlEntities(snippet.title || "Video Tutorial"),
        thumbnail,
        channelTitle: decodeHtmlEntities(snippet.channelTitle || "Educational Channel"),
        description: decodeHtmlEntities(snippet.description || ""),
        duration: durations.get(videoId),
        publishedAt: snippet.publishedAt,
        watchUrl: `https://www.youtube.com/watch?v=${videoId}`,
        embedUrl: `https://www.youtube-nocookie.com/embed/${videoId}`
      };
    });

    // Cache the verified results
    youtubeCache.set(cacheKey, { videos, timestamp: Date.now() });

    return { videos, fallbackSearchUrl };
  } catch (error) {
    console.error("[YouTube API] Exception during video search:", error);
    return { videos: [], fallbackSearchUrl };
  }
}
