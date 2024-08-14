import { Octokit } from "@octokit/rest";
import { Env, PluginInputs } from "./types";
import { Context } from "./types";
import { isIssueCommentEvent } from "./types/typeguards";
import { LogLevel, Logs } from "@ubiquity-dao/ubiquibot-logger";
import { register } from "./handlers/register";
import { faucet } from "./handlers/faucet";
import { throwError } from "./utils/logger";
import { Storage } from "./adapters/storage";

export async function runPlugin(context: Context) {
  const { logger, eventName } = context;

  if (isIssueCommentEvent(context)) {
    return handleSlashCommand(context);
  } else {
    logger.info(`Ignoring event ${eventName}`);
  }
}

function handleSlashCommand(context: Context) {
  const { payload: { comment: { body } } } = context;
  const [command, ...args] = body.split(" ");
  switch (command) {
    case "/register":
      return register(context);
    case "/faucet":
      return faucet(context, args);
    default:
      throwError("Unknown command", { command });
  }
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
  context.storage = await Storage.getInstance(context);

  return runPlugin(context);
}
