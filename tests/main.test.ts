import { drop } from "@mswjs/data";
import { db } from "./__mocks__/db";
import { server } from "./__mocks__/node";
import { expect, describe, beforeAll, beforeEach, afterAll, afterEach, it } from "@jest/globals";
import { Context } from "../src/types/context";
import { Octokit } from "@octokit/rest";
import { STRINGS } from "./__mocks__/strings";
import { createComment, setupTests } from "./__mocks__/helpers";
import manifest from "../manifest.json";
import dotenv from "dotenv";
import { Logs } from "@ubiquity-dao/ubiquibot-logger";
import { Env } from "../src/types";
import { runPlugin } from "../src/plugin";

dotenv.config();
jest.requireActual("@octokit/rest");
const octokit = new Octokit();

beforeAll(() => {
  server.listen();
});
afterEach(() => {
  server.resetHandlers();
  jest.clearAllMocks();
});
afterAll(() => server.close());

describe("Plugin tests", () => {
  beforeEach(async () => {
    drop(db);
    await setupTests();
  });

  it("Should serve the manifest file", async () => {
    const worker = (await import("../src/worker")).default;
    const response = await worker.fetch(new Request("http://localhost/manifest.json"), {});
    const content = await response.json();
    expect(content).toEqual(manifest);
  });

  it("Should handle an issue comment event", async () => {
    const { context, infoSpy, errorSpy, debugSpy, okSpy, verboseSpy } = createContext();

    expect(context.eventName).toBe("issue_comment.created");
    expect(context.payload.comment.body).toBe("/Hello");

    await runPlugin(context);

    expect(errorSpy).not.toHaveBeenCalled();
    expect(debugSpy).toHaveBeenNthCalledWith(1, STRINGS.EXECUTING_HELLO_WORLD, {
      caller: STRINGS.CALLER_LOGS_ANON,
      sender: STRINGS.USER_1,
      repo: STRINGS.TEST_REPO,
      issueNumber: 1,
      owner: STRINGS.USER_1,
    });
    expect(infoSpy).toHaveBeenNthCalledWith(1, STRINGS.HELLO_WORLD);
    expect(okSpy).toHaveBeenNthCalledWith(1, STRINGS.SUCCESSFULLY_CREATED_COMMENT);
    expect(verboseSpy).toHaveBeenNthCalledWith(1, STRINGS.EXITING_HELLO_WORLD);
  });

  it("Should respond with `Hello, World!` in response to /Hello", async () => {
    const { context } = createContext();
    await runPlugin(context);
    const comments = db.issueComments.getAll();
    expect(comments.length).toBe(2);
    expect(comments[1].body).toBe(STRINGS.HELLO_WORLD);
  });

  it("Should respond with `Hello, Code Reviewers` in response to /Hello", async () => {
    const { context } = createContext(STRINGS.CONFIGURABLE_RESPONSE);
    await runPlugin(context);
    const comments = db.issueComments.getAll();
    expect(comments.length).toBe(2);
    expect(comments[1].body).toBe(STRINGS.CONFIGURABLE_RESPONSE);
  });

  it("Should not respond to a comment that doesn't contain /Hello", async () => {
    const { context, errorSpy } = createContext(STRINGS.CONFIGURABLE_RESPONSE, STRINGS.INVALID_COMMAND);
    await runPlugin(context);
    const comments = db.issueComments.getAll();

    expect(comments.length).toBe(1);
    expect(errorSpy).toHaveBeenNthCalledWith(1, STRINGS.INVALID_USE_OF_SLASH_COMMAND, { caller: STRINGS.CALLER_LOGS_ANON, body: STRINGS.INVALID_COMMAND });
  });
});

/**
 * The heart of each test. This function creates a context object with the necessary data for the plugin to run.
 *
 * So long as everything is defined correctly in the db (see `./__mocks__/helpers.ts: setupTests()`),
 * this function should be able to handle any event type and the conditions that come with it.
 *
 * Refactor according to your needs.
 */
function createContext(
  configurableResponse: string = "Hello, world!", // we pass the plugin configurable items here
  commentBody: string = "/Hello",
  repoId: number = 1,
  payloadSenderId: number = 1,
  commentId: number = 1,
  issueOne: number = 1
) {
  const repo = db.repo.findFirst({ where: { id: { equals: repoId } } }) as unknown as Context["payload"]["repository"];
  const sender = db.users.findFirst({ where: { id: { equals: payloadSenderId } } }) as unknown as Context["payload"]["sender"];
  const issue1 = db.issue.findFirst({ where: { id: { equals: issueOne } } }) as unknown as Context["payload"]["issue"];

  createComment(commentBody, commentId); // create it first then pull it from the DB and feed it to _createContext
  const comment = db.issueComments.findFirst({ where: { id: { equals: commentId } } }) as unknown as Context["payload"]["comment"];

  const context = createContextInner(repo, sender, issue1, comment, configurableResponse);
  const infoSpy = jest.spyOn(context.logger, "info");
  const errorSpy = jest.spyOn(context.logger, "error");
  const debugSpy = jest.spyOn(context.logger, "debug");
  const okSpy = jest.spyOn(context.logger, "ok");
  const verboseSpy = jest.spyOn(context.logger, "verbose");

  return {
    context,
    infoSpy,
    errorSpy,
    debugSpy,
    okSpy,
    verboseSpy,
    repo,
    issue1,
  };
}

/**
 * Creates the context object central to the plugin.
 *
 * This should represent the active `SupportedEvents` payload for any given event.
 */
function createContextInner(
  repo: Context["payload"]["repository"],
  sender: Context["payload"]["sender"],
  issue: Context["payload"]["issue"],
  comment: Context["payload"]["comment"],
  configurableResponse: string
): Context {
  return {
    eventName: "issue_comment.created",
    payload: {
      action: "created",
      sender: sender,
      repository: repo,
      issue: issue,
      comment: comment,
      installation: { id: 1 } as Context["payload"]["installation"],
      organization: { login: STRINGS.USER_1 } as Context["payload"]["organization"],
    },
    logger: new Logs("debug"),
    config: {
      configurableResponse,
    },
    env: {} as Env,
    octokit: octokit,
  };
}
