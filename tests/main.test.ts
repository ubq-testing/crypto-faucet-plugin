import { drop } from "@mswjs/data";
import { db } from "./__mocks__/db";
import { server } from "./__mocks__/node";
import { expect, describe, beforeAll, beforeEach, afterAll, afterEach, it } from "@jest/globals";
import { Context } from "../src/types/context";
import { Octokit } from "@octokit/rest";
import { STRINGS } from "./__mocks__/strings";
import { setupTests } from "./__mocks__/helpers";
import manifest from "../manifest.json";
import dotenv from "dotenv";
import { Logs } from "@ubiquity-dao/ubiquibot-logger";
import { runPlugin } from "../src/plugin";
import { RPCHandler } from "@ubiquity-dao/rpc-handler";
import { ethers } from "ethers";
import { createAdapters } from "../src/adapters";
import { createClient } from "@supabase/supabase-js";

import usersGet from "./__mocks__/users-get.json";

dotenv.config();
jest.requireActual("@octokit/rest");
jest.mock("@ubiquity-dao/rpc-handler");

const mockRpcHandler = {
  getFastestRpcProvider: jest.fn().mockResolvedValue(new ethers.providers.JsonRpcProvider("http://localhost:8545")),
};

(RPCHandler as unknown as jest.Mock).mockImplementation(() => mockRpcHandler);

let supabaseMock = {
  getWalletByUserId: jest.fn().mockResolvedValue("0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"),
  hasClaimedBefore: jest.fn().mockResolvedValue(false),
};

jest.mock("../src/adapters/supabase/helpers/user", () => {
  return {
    User: jest.fn().mockImplementation(() => supabaseMock),
  };
});

const octokit = new Octokit();

beforeAll(() => {
  server.listen();
});
afterEach(() => {
  server.resetHandlers();
});
afterAll(() => server.close());

beforeEach(async () => {
  jest.resetModules();
  jest.clearAllMocks();
  drop(db);
  await setupTests();
});

describe("Plugin tests", () => {
  it("Should serve the manifest file", async () => {
    const worker = (await import("../src/worker")).default;
    const response = await worker.fetch(new Request("http://localhost/manifest.json"), {
      SUPABASE_KEY: "",
      SUPABASE_URL: "",
    });
    const content = await response.json();
    expect(content).toEqual(manifest);
  });

  it("Should successfully distribute gas tokens", async () => {
    const { context } = createContext();
    const result = await runPlugin(context);
    const account = new ethers.Wallet(context.config.fundingWalletPrivateKey).address;

    expect(result).toBeDefined();

    if (!result) {
      throw new Error();
    }

    const userOne = result[usersGet[0].login];
    const userTwo = result[usersGet[1].login];

    expect(userOne).toHaveLength(1);
    expect(userTwo).toHaveLength(1);

    const tx = userOne[0];
    const tx2 = userTwo[0];

    verifyTx(tx);
    verifyTx(tx2);

    expect(tx.from).toEqual(account);
    expect(tx2.from).toEqual(account);
  }, 30000);

  it("Should handle an issues.closed event", async () => {
    const context = createContextInner(
      db.repo.findFirst({ where: { id: { equals: 1 } } }) as unknown as Context["payload"]["repository"],
      db.users.findFirst({ where: { id: { equals: 1 } } }) as unknown as Context["payload"]["sender"],
      db.issue.findFirst({ where: { id: { equals: 1 } } }) as unknown as Context<"issues.closed">["payload"]["issue"]
    );
    const result = await runPlugin(context);

    expect(result).toBeDefined();

    if (!result) {
      throw new Error();
    }

    const userOne = result[usersGet[0].login];
    const userTwo = result[usersGet[1].login];

    expect(userOne).toHaveLength(1);
    expect(userTwo).toHaveLength(1);

    const tx = userOne[0];
    const tx2 = userTwo[0];

    verifyTx(tx);
    verifyTx(tx2);
  }, 30000);
});

describe("", () => {
  beforeEach(() => {
    supabaseMock = {
      getWalletByUserId: jest.fn().mockResolvedValue("0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"),
      hasClaimedBefore: jest.fn().mockResolvedValue(true),
    };
  });

  it("Should not distribute if a permit exists in the DB for the user", async () => {
    const { context } = createContext(1, 1, 2);
    const result = await runPlugin(context);
    expect(result).toBeDefined();

    if (!result) {
      throw new Error();
    }

    expect(result).toEqual({});
  }, 30000);
});

function verifyTx(tx: ethers.providers.TransactionReceipt) {
  expect(tx).toHaveProperty("status", 1);
  expect(tx).toHaveProperty("from", "0x70997970C51812dc3A010C7d01b50e0d17dc79C8");
  expect(tx).toHaveProperty("to", "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266");
  expect(tx).toHaveProperty("transactionHash");
  const txHash = tx.transactionHash;
  expect(txHash).toBeDefined();
  expect(txHash).toHaveLength(66);
  expect(txHash).not.toEqual("0x" + "0".repeat(64));
}

function createContext(repoId: number = 1, payloadSenderId: number = 1, issueOne: number = 1) {
  const repo = db.repo.findFirst({ where: { id: { equals: repoId } } }) as unknown as Context["payload"]["repository"];
  const sender = db.users.findFirst({ where: { id: { equals: payloadSenderId } } }) as unknown as Context["payload"]["sender"];
  const issue1 = db.issue.findFirst({ where: { id: { equals: issueOne } } }) as unknown as Context["payload"]["issue"];

  const context = createContextInner(repo, sender, issue1);
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

function createContextInner(repo: Context["payload"]["repository"], sender: Context["payload"]["sender"], issue: Context["payload"]["issue"]) {
  const ctx: Context = {
    eventName: "issues.closed",
    payload: {
      action: "closed",
      sender: sender,
      repository: repo,
      issue: issue,
      installation: { id: 1 } as Context["payload"]["installation"],
      organization: { login: STRINGS.UBIQUITY } as Context["payload"]["organization"],
    } as Context["payload"],
    logger: new Logs("debug"),
    config: {
      fundingWalletPrivateKey: "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d",
      networkId: "100",
      gasSubsidyAmount: BigInt(1e18),
    },
    env: {
      SUPABASE_KEY: "test",
      SUPABASE_URL: "test",
    },
    octokit: octokit,
    adapters: {} as ReturnType<typeof createAdapters>,
  };

  ctx.adapters = createAdapters(createClient("http://localhost:8545", "test"), ctx);

  return ctx;
}
