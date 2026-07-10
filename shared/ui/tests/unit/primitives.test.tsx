import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { useState } from "react";
import { Button } from "../../src/primitives/Button.js";
import { Badge } from "../../src/primitives/Badge.js";
import { Input } from "../../src/primitives/Input.js";
import { Checkbox } from "../../src/primitives/Checkbox.js";
import { Modal } from "../../src/primitives/Modal.js";
import { Tabs, TabList, Tab, TabPanel } from "../../src/primitives/Tabs.js";
import { EmptyState } from "../../src/primitives/EmptyState.js";
import { ErrorState } from "../../src/primitives/ErrorState.js";

describe("Button", () => {
  it("renders children and responds to click", async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Save changes</Button>);
    await userEvent.click(screen.getByRole("button", { name: "Save changes" }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("is disabled and non-clickable while loading", async () => {
    const onClick = vi.fn();
    render(
      <Button isLoading onClick={onClick}>
        Save
      </Button>,
    );
    const button = screen.getByRole("button", { name: /Save/ });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");
  });
});

describe("Badge", () => {
  it("renders its content and variant class", () => {
    render(<Badge variant="success">Active</Badge>);
    const badge = screen.getByText("Active");
    expect(badge.className).toContain("fos-badge-success");
  });
});

describe("Input", () => {
  it("associates the label with the input programmatically", () => {
    render(<Input label="Email address" />);
    const input = screen.getByLabelText("Email address");
    expect(input).toBeInTheDocument();
  });

  it("marks the field invalid and links the error message via aria-describedby", () => {
    render(<Input label="Email address" error="Must be a valid email." />);
    const input = screen.getByLabelText("Email address");
    expect(input).toHaveAttribute("aria-invalid", "true");
    const describedBy = input.getAttribute("aria-describedby");
    expect(describedBy).toBeTruthy();
    expect(document.getElementById(describedBy!)).toHaveTextContent("Must be a valid email.");
  });
});

describe("Checkbox", () => {
  it("toggles when its label is clicked (label/input association works)", async () => {
    const onChange = vi.fn();
    render(<Checkbox label="Enable notifications" onChange={onChange} />);
    await userEvent.click(screen.getByLabelText("Enable notifications"));
    expect(onChange).toHaveBeenCalledTimes(1);
  });
});

describe("Modal", () => {
  function TestModal() {
    const [isOpen, setIsOpen] = useState(true);
    return (
      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title="Delete organization?" description="This cannot be undone.">
        <button>Cancel</button>
        <button>Confirm</button>
      </Modal>
    );
  }

  it("renders with dialog role and aria-modal", () => {
    render(<TestModal />);
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(screen.getByText("Delete organization?")).toBeInTheDocument();
  });

  it("closes on Escape key", () => {
    render(<TestModal />);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("focuses the first focusable element on open", () => {
    render(<TestModal />);
    expect(screen.getByRole("button", { name: "Cancel" })).toHaveFocus();
  });

  it("traps Tab focus within the dialog (wraps from last to first)", () => {
    render(<TestModal />);
    const confirmButton = screen.getByRole("button", { name: "Confirm" });
    confirmButton.focus();
    expect(confirmButton).toHaveFocus();

    fireEvent.keyDown(document, { key: "Tab" });
    expect(screen.getByRole("button", { name: "Cancel" })).toHaveFocus();
  });
});

describe("Tabs", () => {
  function TestTabs() {
    const [value, setValue] = useState("overview");
    return (
      <Tabs value={value} onValueChange={setValue}>
        <TabList aria-label="Report sections">
          <Tab value="overview">Overview</Tab>
          <Tab value="details">Details</Tab>
        </TabList>
        <TabPanel value="overview">Overview content</TabPanel>
        <TabPanel value="details">Details content</TabPanel>
      </Tabs>
    );
  }

  it("shows only the active panel", () => {
    render(<TestTabs />);
    expect(screen.getByText("Overview content")).toBeInTheDocument();
    expect(screen.queryByText("Details content")).not.toBeInTheDocument();
  });

  it("switches panels on tab click", async () => {
    render(<TestTabs />);
    await userEvent.click(screen.getByRole("tab", { name: "Details" }));
    expect(screen.getByText("Details content")).toBeInTheDocument();
    expect(screen.queryByText("Overview content")).not.toBeInTheDocument();
  });

  it("moves focus to the next tab on ArrowRight", () => {
    render(<TestTabs />);
    const overviewTab = screen.getByRole("tab", { name: "Overview" });
    const detailsTab = screen.getByRole("tab", { name: "Details" });
    overviewTab.focus();
    fireEvent.keyDown(overviewTab.parentElement!, { key: "ArrowRight" });
    expect(detailsTab).toHaveFocus();
  });

  it("only the active tab is in the natural tab order (roving tabindex)", () => {
    render(<TestTabs />);
    expect(screen.getByRole("tab", { name: "Overview" })).toHaveAttribute("tabindex", "0");
    expect(screen.getByRole("tab", { name: "Details" })).toHaveAttribute("tabindex", "-1");
  });
});

describe("EmptyState", () => {
  it("renders title, description, and an action", () => {
    render(<EmptyState title="No leads yet" description="Connect a lead source to get started." action={<Button>Connect</Button>} />);
    expect(screen.getByText("No leads yet")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Connect" })).toBeInTheDocument();
  });
});

describe("ErrorState", () => {
  it("renders a retry button and calls onRetry when clicked", async () => {
    const onRetry = vi.fn();
    render(<ErrorState description="Could not load spend data." onRetry={onRetry} />);
    expect(screen.getByRole("alert")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("never renders a retry button when onRetry is not provided", () => {
    render(<ErrorState description="Could not load spend data." />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
