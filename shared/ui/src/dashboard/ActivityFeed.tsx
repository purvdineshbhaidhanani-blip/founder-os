import type { ReactNode } from "react";
import { Skeleton } from "../primitives/Skeleton.js";
import { EmptyState } from "../primitives/EmptyState.js";
import { ErrorState } from "../primitives/ErrorState.js";
import { cn } from "../utils/cn.js";

export interface ActivityFeedEntry {
  id: string;
  actorName: string;
  actorAvatarUrl?: string;
  /** e.g. "created invoice #1042" — combined with actorName to read as a full sentence. */
  description: string;
  timestamp: string;
  icon?: ReactNode;
  href?: string;
}

export interface ActivityFeedProps {
  entries: ActivityFeedEntry[];
  isLoading?: boolean;
  error?: string;
  onRetry?: () => void;
  emptyTitle?: string;
  emptyDescription?: string;
  skeletonCount?: number;
  className?: string;
}

/**
 * Reverse-chronological stream of account-wide activity, per
 * frameworks/06-dashboard-framework.md item 3 — distinct from AlertList,
 * which is "something needs you" rather than "something happened."
 */
export function ActivityFeed({
  entries,
  isLoading = false,
  error,
  onRetry,
  emptyTitle = "No activity yet",
  emptyDescription = "Recent changes across your account will show up here.",
  skeletonCount = 4,
  className,
}: ActivityFeedProps) {
  if (error) {
    return <ErrorState title="Couldn't load activity" description={error} onRetry={onRetry} className={className} />;
  }

  if (isLoading) {
    return (
      <ul className={cn("fos-activity-feed", className)} aria-busy="true">
        {Array.from({ length: skeletonCount }).map((_, index) => (
          <li key={index} className="fos-activity-feed-item">
            <Skeleton className="fos-activity-feed-skeleton-avatar" />
            <Skeleton className="fos-activity-feed-skeleton-line" />
          </li>
        ))}
      </ul>
    );
  }

  if (entries.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} className={className} />;
  }

  return (
    <ul className={cn("fos-activity-feed", className)}>
      {entries.map((entry) => {
        const content = (
          <>
            {entry.icon ? (
              <span className="fos-activity-feed-icon" aria-hidden="true">
                {entry.icon}
              </span>
            ) : entry.actorAvatarUrl ? (
              <img className="fos-activity-feed-avatar" src={entry.actorAvatarUrl} alt="" />
            ) : (
              <span className="fos-activity-feed-avatar-fallback" aria-hidden="true">
                {entry.actorName.charAt(0).toUpperCase()}
              </span>
            )}
            <span className="fos-activity-feed-text">
              <span className="fos-activity-feed-sentence">
                <strong>{entry.actorName}</strong> {entry.description}
              </span>
              <time className="fos-activity-feed-timestamp" dateTime={entry.timestamp}>
                {entry.timestamp}
              </time>
            </span>
          </>
        );

        return (
          <li key={entry.id} className="fos-activity-feed-item">
            {entry.href ? (
              <a href={entry.href} className="fos-activity-feed-link">
                {content}
              </a>
            ) : (
              content
            )}
          </li>
        );
      })}
    </ul>
  );
}
