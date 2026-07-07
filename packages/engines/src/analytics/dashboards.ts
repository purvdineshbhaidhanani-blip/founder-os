export interface DashboardWidget {
  id: string;
  title: string;
  compute: () => Promise<unknown> | unknown;
}

export interface Dashboard {
  id: string;
  name: string;
  widgets: DashboardWidget[];
}

export interface WidgetSnapshot {
  id: string;
  title: string;
  value: unknown;
  error?: string;
}

export interface DashboardSnapshot {
  id: string;
  name: string;
  generatedAt: string;
  widgets: WidgetSnapshot[];
}

/** Computes every widget in a dashboard and returns a point-in-time snapshot. */
export class DashboardEngine {
  async render(dashboard: Dashboard): Promise<DashboardSnapshot> {
    const widgets = await Promise.all(
      dashboard.widgets.map(async (widget): Promise<WidgetSnapshot> => {
        try {
          return { id: widget.id, title: widget.title, value: await widget.compute() };
        } catch (error) {
          return {
            id: widget.id,
            title: widget.title,
            value: null,
            error: error instanceof Error ? error.message : String(error),
          };
        }
      }),
    );
    return { id: dashboard.id, name: dashboard.name, generatedAt: new Date().toISOString(), widgets };
  }
}
