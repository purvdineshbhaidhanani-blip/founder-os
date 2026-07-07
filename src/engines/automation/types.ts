export interface AutomationEvent<TPayload = unknown> {
  type: string;
  payload: TPayload;
  timestamp: string;
  source?: string;
}

export type EventListener<TPayload = unknown> = (
  event: AutomationEvent<TPayload>,
) => void | Promise<void>;

export interface TriggerDefinition<TPayload = unknown> {
  id: string;
  eventType: string;
  /** Narrows which events on `eventType` actually fire this trigger. Defaults to always. */
  filter?: (event: AutomationEvent<TPayload>) => boolean;
}

export interface ActionDefinition<TPayload = unknown> {
  id: string;
  execute: (event: AutomationEvent<TPayload>) => void | Promise<void>;
}

export interface AutomationRule {
  id: string;
  triggerId: string;
  actionIds: string[];
}
