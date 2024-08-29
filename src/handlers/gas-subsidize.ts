import { ethers } from "ethers";
import { Context } from "../types";
import { throwError } from "../utils/logger";
import { faucet, getRpcProvider } from "./faucet";
import { NetworkId } from "@ubiquity-dao/rpc-handler";

export async function gasSubsidize(context: Context) {
  const {
    payload,
    config: { networkId, gasSubsidyAmount },
    adapters: { supabase },
    logger,
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

  const txs: Record<string, ethers.providers.TransactionReceipt | null> = {};

  for (const user of users) {
    if (!user?.login) continue;
    const userWallet = await supabase.user.getWalletByUserId(user.id, payload.issue.number);
    if (!userWallet) {
      continue;
    }

    const userGasBalance = await fetchUserBalance(context, userWallet);

    logger.info(`User ${user.login} has ${ethers.utils.formatEther(userGasBalance)} ETH`);

    if (userGasBalance.gt(gasSubsidyAmount)) {
      logger.info(`User ${user.login} already has enough gas`);
      continue;
    }

    if (await supabase.user.hasClaimedBefore(user.id)) {
      logger.info(`User ${user.login} has already claimed a gas subsidy`);
      continue;
    }

    txs[user.login] ??= null;
    const tx = await faucet(context, { recipient: userWallet, networkId, amount: gasSubsidyAmount });
    if (tx) {
      txs[user.login] = tx;
    }
  }

  return txs;
}

async function fetchUserBalance(context: Context, userWallet: string) {
  const provider = await getRpcProvider(context.config.networkId as NetworkId);
  return await provider.getBalance(userWallet);
}
