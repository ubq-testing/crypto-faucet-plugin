import { Args, Context } from "../types";
import { logAndComment } from "../utils/logger";

export async function register(context: Context<"issue_comment.created">, args: Args) {
  const { storage } = context;
  let { recipient: username } = args;

  if (!username) {
    username = context.payload.comment?.user?.login ?? context.payload.sender.login;
  }

  const user = storage.getUserStorage(username);

  if (user) {
    return await logAndComment(context, "info", "User already registered", { username });
  }

  storage.setUserStorage(username, { claimed: 0, lastClaim: null, wallet: null });

  await storage.save(storage.data[username]);

  return await logAndComment(context, "info", "Please go to https://safe.ubq.fi to finalize registering your account.", { username });
}
