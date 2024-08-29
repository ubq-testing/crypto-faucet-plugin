import { Octokit } from "@octokit/rest";
import { Env, PluginInputs } from "./types";
import { Context } from "./types";
import { LogLevel, Logs } from "@ubiquity-dao/ubiquibot-logger";
import { gasSubsidize } from "./handlers/gas-subsidize";
import { isIssueClosedEvent } from "./types/typeguards";
import { createAdapters } from "./adapters";
import { createClient } from "@supabase/supabase-js";
import { logAndComment } from "./utils/logger";

export async function runPlugin(context: Context) {
  const { logger, eventName } = context;

  if (isIssueClosedEvent(context)) {
    const txs = await gasSubsidize(context);

    if (!txs) {
      logger.info("No gas subsidy transactions were sent.");
      return;
    }

    const comment = `
    ${Object.entries(txs).forEach(([user, tx]) => {
      if (!tx) return;
      let cmt = `Gas subsidy sent to ${user}:\n`;
      cmt += `- [\`${tx.transactionHash.slice(0, 8)}\`](https://blockscan.com/tx/${tx.transactionHash})\n`;
    })}`;

    await logAndComment(context, "info", comment, { txs });
    return txs;
  }

  logger.info(`Ignoring event ${eventName}`);
}

export async function plugin(inputs: PluginInputs, env: Env) {
  const octokit = new Octokit({ auth: inputs.authToken });

  const context: Context = {
    eventName: inputs.eventName,
    payload: inputs.eventPayload,
    config: inputs.settings,
    octokit,
    env,
    logger: new Logs("info" as LogLevel),
    adapters: {} as ReturnType<typeof createAdapters>,
  };

  context.adapters = createAdapters(createClient(env.SUPABASE_URL, env.SUPABASE_KEY), context);

  return runPlugin(context);
}
