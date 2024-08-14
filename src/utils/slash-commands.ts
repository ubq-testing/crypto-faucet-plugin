import { STRINGS } from "../../tests/__mocks__/strings";
import { faucet } from "../handlers/faucet";
import { isIssueCommentEvent } from "../types/typeguards";
import { logAndComment, throwError } from "./logger";
import { Context } from "../types";
import { register } from "../handlers/register";

export async function handleSlashCommand(context: Context) {
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
      recipient: context.payload.comment.user?.login.toLowerCase() ?? context.payload.sender.login.toLowerCase(),
      networkId: "1",
      amount: BigInt(0),
      token: "native",
    };
  } else {
    await logAndComment(context, "error", STRINGS.INVALID_USE_OF_ARGS);
    throwError(STRINGS.INVALID_USE_OF_ARGS);
  }
}
