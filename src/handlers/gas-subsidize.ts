import { ethers } from "ethers";
import { Context } from "../types";
import { throwError } from "../utils/logger";
import { faucet } from "./faucet";

export async function gasSubsidize(context: Context) {
  const {
    payload,
    config: { networkId, gasSubsidyAmount },
    adapters: { supabase },
  } = context;
  const { issue } = payload;

  if (!issue || issue.state !== "closed" || issue.state_reason !== "completed") {
    return throwError("Issue is not closed or completed", { issue });
  }

  let users: Array<Context["payload"]["issue"]["assignee"] | Context["payload"]["issue"]["user"]> = [];

  if (issue.assignees?.length) {
    users = issue.assignees;
  } else if (issue.assignee) {
    users = [issue.assignee];
  }

  users.push(issue.user);

  const txs: Record<string, ethers.providers.TransactionReceipt[]> = {};

  for (const user of users) {
    if (!user?.login) continue;
    const userWallet = await supabase.user.getWalletByUserId(user.id, payload.issue.id);
    if (!userWallet) {
      continue;
    }

    if (await supabase.user.hasClaimedBefore(user.id)) {
      context.logger.info(`User ${user.login} has already claimed a gas subsidy`);
      continue;
    }

    txs[user.login] ??= [];
    const tx = await faucet(context, { recipient: userWallet, networkId, amount: gasSubsidyAmount });
    if (tx) {
      txs[user.login].push(tx);
    }
  }

  return txs;
}
