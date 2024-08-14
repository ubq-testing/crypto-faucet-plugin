import { Args, Context } from "../types";
import { logAndComment, throwError } from "../utils/logger";

export async function register(context: Context, args: Args) {
    const { storage } = context;
    const { recipient: username } = args;

    if (!username) {
        throwError("No username found in args");
    }

    const user = storage.getUserStorage(username);

    if (user) {
        return await logAndComment(context, "info", "User already registered", { username });
    }

    storage.setUserStorage(username, { claimed: 0, lastClaim: null, wallet: null });

    await storage.save(storage.data[username]);

    return await logAndComment(context, "info", "Please go to https://safe.ubq.fi to finalize registering your account.", { username });
}
