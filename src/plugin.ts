import { Octokit } from "@octokit/rest";
import { Env, PluginInputs } from "./types";
import { Context } from "./types";
import { isIssueCommentEvent } from "./types/typeguards";
import { LogLevel, Logs } from "@ubiquity-dao/ubiquibot-logger";
import { register } from "./handlers/register";
import { faucet } from "./handlers/faucet";
import { logAndComment, throwError } from "./utils/logger";
import { Storage } from "./adapters/storage";

export async function runPlugin(context: Context) {
  const { logger, eventName } = context;
  context.storage = new Storage(context);
  await context.storage.init();

  if (isIssueCommentEvent(context)) {
    return await handleSlashCommand(context);
  } else {
    logger.info(`Ignoring event ${eventName}`);
  }
}

async function handleSlashCommand(context: Context) {
  const { payload: { comment: { body } } } = context;
  const [command, ...args] = body.split(" ");
  const params = await parseArgs(context, args.filter(arg => arg !== ""))
  switch (command) {
    case "/register":
      return register(context, params);
    case "/faucet":
      if (Object.keys(params).length < 2) {
        await logAndComment(context, "error", "Invalid number of arguments");
        throwError("Invalid number of arguments");
      }
      return faucet(context, params);
    default:
      throwError("Unknown command", { command });
  }
}

export async function parseArgs(context: Context, args: string[]) {
  if (args.length === 4) {
    return {
      recipient: args[0].toLowerCase(),
      networkId: args[1],
      amount: BigInt(args[2]),
      token: args[3].toLowerCase()
    }
  } else if (args.length === 3) {
    return {
      recipient: args[0].toLowerCase(),
      networkId: args[1],
      amount: BigInt(args[2]),
      token: "native"
    }
  } else if (args.length === 2) {
    return {
      recipient: args[0].toLowerCase(),
      networkId: args[1],
      amount: BigInt(0),
      token: "native"
    }
  } else if (args.length < 2) {
    // only used in /register
    return {
      recipient: context.payload.comment.user?.login ?? context.payload.sender.login,
      networkId: "1",
      amount: BigInt(0),
      token: "native"
    }
  } else {
    await logAndComment(context, "error", "Invalid number of arguments");
    throwError("Invalid number of arguments");
  }
};

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
