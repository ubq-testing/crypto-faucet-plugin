import { Context } from "./context";

export function isIssueClosedEvent(context: Context): context is Context<"issues.closed"> {
  return context.eventName === "issues.closed";
}
