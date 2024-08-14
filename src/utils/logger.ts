import { LogLevel, Logs } from "@ubiquity-dao/ubiquibot-logger";
import { Context } from "../types";

// typed as never so that ts registers that it cannot return undefined
export function throwError(err: string, rest?: object): never {
  const logger = new Logs("debug");
  const error = logger.error(err, rest);
  throw new Error(`${error?.logMessage.diff}\n${JSON.stringify(error?.metadata, null, 2)}`);
}

export async function logAndComment(context: Context, type: LogLevel, message: string, metadata?: object) {
  const { logger, octokit, payload } = context;
  const log = logger[type](message, metadata);

  if (log) {
    await octokit.issues.createComment({
      owner: payload.repository.owner.login,
      repo: payload.repository.name,
      issue_number: payload.issue.number,
      body: log.logMessage.diff,
    });
    return log;
  } else {
    throwError(`Failed to log and comment: ${message}`, metadata);
  }
}
