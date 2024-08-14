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
import { HandlerConstructorConfig, RPCHandler } from "@ubiquity-dao/rpc-handler";
import { Storage } from "../src/adapters/storage";
import { ethers } from "ethers";

dotenv.config();
jest.requireActual("@octokit/rest");

jest.mock("@ubiquity-dao/rpc-handler");
const mockRPCHandler = {
  getFastestRpcProvider: jest.fn().mockResolvedValue(new ethers.providers.JsonRpcProvider("http://localhost:8545")),
};
(RPCHandler as unknown as jest.Mock).mockImplementation(() => mockRPCHandler);

const octokit = new Octokit();

export const testConfig: HandlerConstructorConfig = {
  networkId: "1337",
  autoStorage: false,
  cacheRefreshCycles: 3,
  networkName: null,
  networkRpcs: null,
  rpcTimeout: 600,
  runtimeRpcs: null,
  proxySettings: {
    retryCount: 3,
    retryDelay: 10,
    logTier: "info",
    logger: null,
    strictLogs: true,
  },
};

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

  it("Should successfully distribute gas tokens", async () => {
    const { context } = createContext("/faucet keyrxng 100 1 native");
    const result = await runPlugin(context);
    expect(result).toHaveProperty("status", 1);
    const account = new ethers.Wallet(context.config.fundingWalletPrivateKey).address;
    expect(result).toHaveProperty("from", account);
  });

  it("Should handle the /register command", async () => {
    const { context } = createContext("/register", 1, 3);
    const result = await runPlugin(context);
    if (!result) {
      throw new Error("Expected LogReturn");
    }

    if ("logMessage" in result) {
      expect(result.logMessage.raw).toContain("Please go to https://safe.ubq.fi to finalize registering your account.");
    } else {
      throw new Error("Expected LogReturn");
    }
  });

  it("Should handle an issues.closed event", async () => {
    const context = createIssuesClosedContext(
      db.repo.findFirst({ where: { id: { equals: 1 } } }) as unknown as Context["payload"]["repository"],
      db.users.findFirst({ where: { id: { equals: 1 } } }) as unknown as Context["payload"]["sender"],
      db.issue.findFirst({ where: { id: { equals: 1 } } }) as unknown as Context<"issues.closed">["payload"]["issue"],
    );
    const result = await runPlugin(context);
    if (result && Array.isArray(result)) {
      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty("status", 1);
      expect(result[1]).toHaveProperty("status", 1);

      expect(result[0]).toHaveProperty("from", "0x70997970C51812dc3A010C7d01b50e0d17dc79C8");
      expect(result[0]).toHaveProperty("to", "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266");

      expect(result[1]).toHaveProperty("from", "0x70997970C51812dc3A010C7d01b50e0d17dc79C8");
      expect(result[1]).toHaveProperty("to", "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC");
    } else {
      throw new Error("Expected array of transactions");
    }
  });
});

function createContext(
  commentBody: string,
  repoId: number = 1,
  payloadSenderId: number = 1,
  commentId: number = 1,
  issueOne: number = 1
) {
  const repo = db.repo.findFirst({ where: { id: { equals: repoId } } }) as unknown as Context["payload"]["repository"];
  const sender = db.users.findFirst({ where: { id: { equals: payloadSenderId } } }) as unknown as Context["payload"]["sender"];
  const issue1 = db.issue.findFirst({ where: { id: { equals: issueOne } } }) as unknown as Context["payload"]["issue"];

  createComment(commentBody, commentId, 3, "test");
  const comment = db.issueComments.findFirst({ where: { id: { equals: commentId } } })

  const context = createContextInner(repo, sender, issue1, comment);
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

function createContextInner(
  repo: Context["payload"]["repository"],
  sender: Context["payload"]["sender"],
  issue: Context["payload"]["issue"],
  comment: unknown
) {
  const ctx: Context = {
    eventName: "issue_comment.created",
    payload: {
      action: "created",
      sender: sender,
      repository: repo,
      issue: issue,
      comment,
      installation: { id: 1 } as Context["payload"]["installation"],
      organization: { login: STRINGS.UBIQUITY } as Context["payload"]["organization"],
    } as Context["payload"],
    storage: {} as Storage,
    logger: new Logs("debug"),
    config: {
      fundingWalletPrivateKey: "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d",
      networkIds: [100, 1],
      nativeGasToken: BigInt(1e18),
      howManyTimesUserCanClaim: 1,
      // distributionTokens: {}
    },
    env: {} as Env,
    octokit: octokit,
  };

  ctx.storage = new Storage(ctx);
  return ctx;
}

function createIssuesClosedContext(
  repo: Context["payload"]["repository"],
  sender: Context["payload"]["sender"],
  issue: Context<"issues.closed">["payload"]["issue"],
) {
  const ctx: Context<"issues.closed"> = {
    eventName: "issues.closed",
    payload: {
      action: "closed",
      sender: sender,
      repository: repo,
      issue: issue,
      installation: { id: 1 } as Context["payload"]["installation"],
      organization: { login: STRINGS.UBIQUITY } as Context["payload"]["organization"],
    },
    storage: {} as Storage,
    logger: new Logs("debug"),
    config: {
      fundingWalletPrivateKey: "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d",
      networkIds: [1337],
      nativeGasToken: BigInt(1e18),
      howManyTimesUserCanClaim: 1,
      // distributionTokens: {}
    },
    env: {} as Env,
    octokit: octokit,
  };

  ctx.storage = new Storage(ctx);
  return ctx;
}
