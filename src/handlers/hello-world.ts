import { Context } from "../types";

/**
 * NOTICE: Remove this file or use it as a template for your own plugins.
 *
 * This encapsulates the logic for a plugin if the only thing it does is say "Hello, world!".
 *
 * Try it out by running your local kernel worker and running the `yarn worker` command.
 * Comment on an issue in a repository where your GitHub App is installed and see the magic happen!
 *
 * Logger examples are provided to show how to log different types of data.
 */
export async function helloWorld(context: Context) {
  const {
    logger,
    payload,
    octokit,
    config: { configurableResponse },
  } = context;

  const sender = payload.comment.user?.login;
  const repo = payload.repository.name;
  const issueNumber = payload.issue.number;
  const owner = payload.repository.owner.login;
  const body = payload.comment.body;

  if (!body.match(/hello/i)) {
    logger.error(`Invalid use of slash command, use "/hello".`, { body });
    return;
  }

  logger.info("Hello, world!");
  logger.debug(`Executing helloWorld:`, { sender, repo, issueNumber, owner });

  try {
    await octokit.issues.createComment({
      owner: payload.repository.owner.login,
      repo: payload.repository.name,
      issue_number: payload.issue.number,
      body: configurableResponse,
    });
  } catch (error) {
    /**
     * logger.fatal should not be used in 9/10 cases. Use logger.error instead.
     *
     * Below are examples of passing error objects to the logger, only one is needed.
     */
    if (error instanceof Error) {
      logger.error(`Error creating comment:`, { error: error, stack: error.stack });
      throw error;
    } else {
      logger.error(`Error creating comment:`, { err: error, error: new Error() });
      throw error;
    }
  }

  logger.ok(`Successfully created comment!`);
  logger.verbose(`Exiting helloWorld`);
}
