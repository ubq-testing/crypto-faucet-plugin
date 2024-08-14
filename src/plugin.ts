import { Octokit } from "@octokit/rest";
import { Env, PluginInputs } from "./types";
import { Context } from "./types";
import { isIssueCommentEvent } from "./types/typeguards";
import { helloWorld } from "./handlers/hello-world";
import { LogLevel, Logs } from "@ubiquity-dao/ubiquibot-logger";

/**
 * The main plugin function. Split for easier testing.
 */
export async function runPlugin(context: Context) {
  const { logger, eventName } = context;

  if (isIssueCommentEvent(context)) {
    return await helloWorld(context);
  }

  logger.error(`Unsupported event: ${eventName}`);
}

/**
 * How a worker executes the plugin.
 */
export async function plugin(inputs: PluginInputs, env: Env) {
  const octokit = new Octokit({ auth: inputs.authToken });

  const context: Context = {
    eventName: inputs.eventName,
    payload: inputs.eventPayload,
    config: inputs.settings,
    octokit,
    env,
    logger: new Logs("info" as LogLevel),
  };

  /**
   * NOTICE: Consider non-database storage solutions unless necessary
   *
   * Initialize storage adapters here. For example, to use Supabase:
   *
   * import { createClient } from "@supabase/supabase-js";
   *
   * const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_KEY);
   * context.adapters = createAdapters(supabase, context);
   */

  return runPlugin(context);
}
