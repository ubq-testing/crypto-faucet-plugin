import { Context } from "./context";

function isCommentEvent(context: Context): context is Context<"issue_comment.created"> {
  return context.eventName === "issue_comment.created";
}

export function isIssueCommentEvent(context: Context): context is Context<"issue_comment.created"> {
  return isCommentEvent(context) && context.payload.comment.body.startsWith("/");
}

export function isIssueClosedEvent(context: Context): context is Context<"issues.closed"> {
  return context.eventName === "issues.closed";
}
