import { Context } from "../types";
import { logAndComment, throwError } from "../utils/logger";

export async function register(context: Context) {
    const { payload, storage } = context;

    const username = payload.comment.user?.login;

    if (!username) {
        throwError("No username found in payload");
    }

    const user = storage.get(username);

    if (user) {
        return logAndComment(context, "info", "User already registered", { username });
    }

    storage.set(username, { claimed: 0, lastClaim: null });

    await storage.save(storage.data[username]);

    return logAndComment(context, "info", "Please go to https://safe.ubq.fi to finalize registering your account.", { username });
}