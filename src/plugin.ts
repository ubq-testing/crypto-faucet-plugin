import { Octokit } from "@octokit/rest";
import { Env, PluginInputs } from "./types";
import { Context } from "./types";
import { LogLevel, Logs } from "@ubiquity-dao/ubiquibot-logger";
import { Storage } from "./adapters/storage";
import { gasSubsidize } from "./handlers/gas-subsidize";
import { isIssueClosedEvent, isIssueCommentEvent } from "./types/typeguards";
import { handleSlashCommand } from "./utils/slash-commands";

export async function runPlugin(context: Context) {
  const { logger, eventName } = context;
  context.storage = new Storage(context);
  await context.storage.init();

  if (isIssueCommentEvent(context)) {
    return await handleSlashCommand(context);
  } else if (isIssueClosedEvent(context)) {
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
    storage: {} as Storage,
  };

  return runPlugin(context);
}
