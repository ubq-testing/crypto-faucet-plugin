import { Octokit } from "@octokit/rest";
import { Env, PluginInputs } from "./types";
import { Context } from "./types";
import { LogLevel, Logs } from "@ubiquity-dao/ubiquibot-logger";
import { gasSubsidize } from "./handlers/gas-subsidize";
import { isIssueClosedEvent } from "./types/typeguards";
import { createAdapters } from "./adapters";
import { createClient } from "@supabase/supabase-js";

export async function runPlugin(context: Context) {
  const { logger, eventName } = context;

  if (isIssueClosedEvent(context)) {
    return await gasSubsidize(context);
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
