import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { KPICard } from "../../src/dashboard/KPICard.js";
import { DataTable, type DataTableColumn } from "../../src/dashboard/DataTable.js";
import { ActivityFeed } from "../../src/dashboard/ActivityFeed.js";
import { AlertList } from "../../src/dashboard/AlertList.js";
import { QuickActions } from "../../src/dashboard/QuickActions.js";
import { GlobalSearch } from "../../src/dashboard/GlobalSearch.js";
import { DashboardShell } from "../../src/layout/DashboardShell.js";

describe("KPICard", () => {
  it("renders the value and a positive trend", () => {
    render(<KPICard label="MRR" value="$42,000" trendValue={12.4} trendDirection="up" />);
    expect(screen.getByText("$42,000")).toBeInTheDocument();
    expect(screen.getByText(/12\.4% vs\. previous period/)).toBeInTheDocument();
  });

  it("shows skeletons instead of content while loading", () => {
    render(<KPICard label="MRR" value="$42,000" isLoading />);
    expect(screen.queryByText("$42,000")).not.toBeInTheDocument();
  });
});

interface Row {
  id: string;
  name: string;
  amount: number;
}

const columns: DataTableColumn<Row>[] = [
  { key: "name", header: "Name", sortable: true, render: (row) => row.name },
  { key: "amount", header: "Amount", align: "right", render: (row) => `$${row.amount}` },
];

describe("DataTable", () => {
  it("renders rows via the column render function", () => {
    render(
      <DataTable
        columns={columns}
        rows={[{ id: "1", name: "Acme", amount: 100 }]}
        getRowId={(row) => row.id}
      />,
    );
    expect(screen.getByText("Acme")).toBeInTheDocument();
    expect(screen.getByText("$100")).toBeInTheDocument();
  });

  it("shows an empty state when there are no rows and not loading", () => {
    render(<DataTable columns={columns} rows={[]} getRowId={(row) => row.id} emptyTitle="No records yet" />);
    expect(screen.getByText("No records yet")).toBeInTheDocument();
  });

  it("toggles sort direction on repeated header clicks", async () => {
    const onSortChange = vi.fn();
    render(
      <DataTable
        columns={columns}
        rows={[{ id: "1", name: "Acme", amount: 100 }]}
        getRowId={(row) => row.id}
        sortKey="name"
        sortDirection="asc"
        onSortChange={onSortChange}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: /Name/ }));
    expect(onSortChange).toHaveBeenCalledWith("name", "desc");
  });

  it("invokes onRowClick with the clicked row", async () => {
    const onRowClick = vi.fn();
    render(
      <DataTable
        columns={columns}
        rows={[{ id: "1", name: "Acme", amount: 100 }]}
        getRowId={(row) => row.id}
        onRowClick={onRowClick}
      />,
    );
    await userEvent.click(screen.getByText("Acme"));
    expect(onRowClick).toHaveBeenCalledWith({ id: "1", name: "Acme", amount: 100 });
  });

  it("renders an error state instead of the table when error is set", () => {
    render(<DataTable columns={columns} rows={[]} getRowId={(row) => row.id} error="Request timed out." />);
    expect(screen.getByText("Request timed out.")).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });
});

describe("ActivityFeed", () => {
  it("renders entries in the given order with actor and description", () => {
    render(
      <ActivityFeed
        entries={[
          { id: "1", actorName: "Priya", description: "created invoice #1042", timestamp: "2026-07-10" },
        ]}
      />,
    );
    expect(screen.getByText("Priya")).toBeInTheDocument();
    expect(screen.getByText(/created invoice #1042/)).toBeInTheDocument();
  });

  it("shows the empty state when there are no entries", () => {
    render(<ActivityFeed entries={[]} emptyTitle="No activity yet" />);
    expect(screen.getByText("No activity yet")).toBeInTheDocument();
  });
});

describe("AlertList", () => {
  it("orders alerts by severity, critical first", () => {
    render(
      <AlertList
        alerts={[
          { id: "1", severity: "info", title: "Info alert" },
          { id: "2", severity: "critical", title: "Critical alert" },
          { id: "3", severity: "warning", title: "Warning alert" },
        ]}
      />,
    );
    const titles = screen.getAllByText(/alert$/i).map((el) => el.textContent);
    expect(titles).toEqual(["Critical alert", "Warning alert", "Info alert"]);
  });
});

describe("QuickActions", () => {
  it("renders nothing when there are no actions (role-scoped down to zero)", () => {
    const { container } = render(<QuickActions actions={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("invokes onSelect when an action is clicked", async () => {
    const onSelect = vi.fn();
    render(<QuickActions actions={[{ id: "1", label: "Create lead", onSelect }]} />);
    await userEvent.click(screen.getByRole("button", { name: "Create lead" }));
    expect(onSelect).toHaveBeenCalledTimes(1);
  });
});

describe("GlobalSearch", () => {
  it("opens the palette via the trigger and lets Enter select the active result", async () => {
    const onSelect = vi.fn();
    function Harness() {
      return (
        <GlobalSearch
          query="acme"
          onQueryChange={() => {}}
          results={[{ id: "1", title: "Acme Corp", onSelect }]}
        />
      );
    }
    render(<Harness />);
    await userEvent.click(screen.getByRole("button", { name: /Search everything/ }));
    expect(screen.getByRole("searchbox")).toBeInTheDocument();
    expect(screen.getByText("Acme Corp")).toBeInTheDocument();

    fireEvent.keyDown(screen.getByRole("searchbox"), { key: "Enter" });
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it("opens on Cmd+K from anywhere in the document", () => {
    render(<GlobalSearch query="" onQueryChange={() => {}} results={[]} />);
    expect(screen.queryByRole("searchbox")).not.toBeInTheDocument();
    fireEvent.keyDown(document, { key: "k", metaKey: true });
    expect(screen.getByRole("searchbox")).toBeInTheDocument();
  });
});

describe("DashboardShell", () => {
  it("renders nav items (via the mobile nav toggle, since jsdom reports no min-width match) and marks the active one with aria-current", async () => {
    render(
      <DashboardShell
        navItems={[
          { id: "1", label: "Overview", href: "/overview", isActive: true },
          { id: "2", label: "Reports", href: "/reports" },
        ]}
      >
        <p>Main content</p>
      </DashboardShell>,
    );
    expect(screen.getByText("Main content")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Toggle navigation" }));
    expect(screen.getByRole("link", { name: "Overview" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Reports" })).not.toHaveAttribute("aria-current");
  });
});
