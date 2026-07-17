import readline from "node:readline/promises";
import type { EventBus } from "../runtime/events/bus.js";
import type { ApprovalSystem } from "../runtime/approval/system.js";
import { stdout } from "./output.js";

/**
 * Bridges the EXISTING `ApprovalSystem`'s `approval.requested` event to a
 * real interactive `[y/N]` prompt on the CLI's own stdin/stdout — the actual
 * "ask-user" experience for a human running `founder agent execute`/
 * `founder run`. No new approval mechanism: this only calls
 * `approvals.grant()`/`.reject()`, exactly like a UI or another CLI would.
 */
export function attachInteractiveApprovalPrompt(bus: EventBus, approvals: ApprovalSystem): void {
  bus.subscribe({ name: "approval.requested" }, async (event) => {
    const { id, reason } = event.payload as { id: string; reason: string };
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    try {
      stdout(`\nApproval requested: ${reason}`);
      const answer = (await rl.question("Allow? [y/N] ")).trim().toLowerCase();
      if (answer === "y" || answer === "yes") {
        approvals.grant(id, "cli-operator");
      } else {
        approvals.reject(id, "cli-operator");
      }
    } finally {
      rl.close();
    }
  });
}
