import { Octokit } from "@octokit/rest";
import { Env, PluginInputs } from "./types";
import { Context } from "./types";
import { LogLevel, Logs } from "@ubiquity-dao/ubiquibot-logger";
import { register } from "./handlers/register";
import { faucet } from "./handlers/faucet";
import { logAndComment, throwError } from "./utils/logger";
import { Storage } from "./adapters/storage";
import { gasSubsidize } from "./handlers/gas-subsidize";
import { STRINGS } from "../tests/__mocks__/strings";

export async function runPlugin(context: Context) {
  const { logger, eventName } = context;
  context.storage = new Storage(context);
  await context.storage.init();

  if (isIssueCommentEvent(context)) {
    return await handleSlashCommand(context);
  } else if (isIssueClosedEvent(context)) {
    return await gasSubsidize(context);
  }
  {
    logger.info(`Ignoring event ${eventName}`);
  }
}

function isCommentEvent(context: Context): context is Context<"issue_comment.created"> {
  return context.eventName === "issue_comment.created";
}

function isIssueCommentEvent(context: Context): context is Context<"issue_comment.created"> {
  return isCommentEvent(context) && context.payload.comment.body.startsWith("/");
}

function isIssueClosedEvent(context: Context): context is Context<"issues.closed"> {
  return context.eventName === "issues.closed";
}

async function handleSlashCommand(context: Context) {
  if (isIssueCommentEvent(context)) {
    const {
      payload: {
        comment: { body },
      },
    } = context;
    const [command, ...args] = body.split(" ");
    const params = await parseArgs(
      context,
      args.filter((arg) => arg !== "")
    );
    switch (command) {
      case "/register":
        return register(context, params);
      case "/faucet":
        if (Object.keys(params).length < 2) {
          await logAndComment(context, "error", STRINGS.INVALID_USE_OF_ARGS);
          throwError(STRINGS.INVALID_USE_OF_ARGS);
        }
        return faucet(context, params);
      default:
        throwError("Unknown command", { command });
    }
  } else {
    throwError("Unknown event type", { eventName: context.eventName });
  }
}

export async function parseArgs(context: Context<"issue_comment.created">, args: string[]) {
  if (args.length === 4) {
    return {
      recipient: args[0].toLowerCase(),
      networkId: args[1],
      amount: BigInt(args[2]),
      token: args[3].toLowerCase(),
    };
  } else if (args.length === 3) {
    return {
      recipient: args[0].toLowerCase(),
      networkId: args[1],
      amount: BigInt(args[2]),
      token: "native",
    };
  } else if (args.length === 2) {
    return {
      recipient: args[0].toLowerCase(),
      networkId: args[1],
      amount: BigInt(0),
      token: "native",
    };
  } else if (args.length < 2) {
    // only used in /register
    return {
      recipient: context.payload.comment.user?.login ?? context.payload.sender.login,
      networkId: "1",
      amount: BigInt(0),
      token: "native",
    };
  } else {
    await logAndComment(context, "error", STRINGS.INVALID_USE_OF_ARGS);
    throwError(STRINGS.INVALID_USE_OF_ARGS);
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

  return runPlugin(context);
}
