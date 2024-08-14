import { Context } from "../types";
import { register } from "./register";
import { logAndComment, throwError } from "../utils/logger";
import { faucet } from "./faucet";

export async function gasSubsidize(context: Context) {
    const { payload, storage, config: { howManyTimesUserCanClaim, networkIds, nativeGasToken } } = context;
    const { issue } = payload

    if (!issue || issue.state !== "closed" || issue.state_reason !== "completed") {
        return throwError("Issue is not closed or completed", { issue });
    }

    const users = issue.assignees?.length ? issue.assignees : issue.assignee ? [issue.assignee] : [];
    users.push(issue.user);

    const txs = [];

    for (const user of users) {
        if (!user?.login) continue;
        const { wallet, lastClaim, claimed } = storage.getUserStorage(user.login);
        if (!wallet) {
            await register(context as Context<"issue_comment.created">, { recipient: user.login, networkId: "1", amount: BigInt(0), token: "native" });
            continue;
        }
        if (lastClaim && claimed < howManyTimesUserCanClaim) {
            await logAndComment(context, "info", `User ${user.login} has already claimed ${claimed} times`);
            continue;
        }

        for (const networkId of networkIds) {
            txs.push(await faucet(context, { recipient: user.login, networkId: String(networkId), amount: nativeGasToken, token: "native" }));
        }
    }

    return txs;
}
