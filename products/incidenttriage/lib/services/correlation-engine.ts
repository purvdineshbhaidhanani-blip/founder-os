export interface CorrelationCandidateAlert {
  id: string;
  serviceId: string;
  occurredAt: Date;
}

export interface IncidentGroup {
  serviceId: string;
  alertIds: string[];
}

/**
 * Groups alerts into incident candidates per
 * products/incidenttriage/docs/PRODUCT_IDENTITY.md §7 "Alert
 * correlation: Ingest alerts from existing tools and correlate related
 * alerts into a single incident." Alerts for the same service within
 * windowMinutes of the PREVIOUS alert in the chain (not the first) are
 * chained into one group, so a slow-burning cascade of alerts every few
 * minutes still correlates into a single incident even if the total span
 * exceeds the window.
 */
export function correlateAlertsIntoIncidents(alerts: CorrelationCandidateAlert[], windowMinutes: number): IncidentGroup[] {
  const windowMs = windowMinutes * 60 * 1000;
  const byService = new Map<string, CorrelationCandidateAlert[]>();
  for (const alert of alerts) {
    const list = byService.get(alert.serviceId) ?? [];
    list.push(alert);
    byService.set(alert.serviceId, list);
  }

  const groups: IncidentGroup[] = [];
  for (const [serviceId, serviceAlerts] of byService) {
    const sorted = [...serviceAlerts].sort((a, b) => a.occurredAt.getTime() - b.occurredAt.getTime());
    let currentGroup: CorrelationCandidateAlert[] = [];

    for (const alert of sorted) {
      const previous = currentGroup[currentGroup.length - 1];
      if (previous && alert.occurredAt.getTime() - previous.occurredAt.getTime() > windowMs) {
        groups.push({ serviceId, alertIds: currentGroup.map((a) => a.id) });
        currentGroup = [];
      }
      currentGroup.push(alert);
    }
    if (currentGroup.length > 0) {
      groups.push({ serviceId, alertIds: currentGroup.map((a) => a.id) });
    }
  }

  return groups;
}
