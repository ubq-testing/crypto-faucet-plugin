import { BigNumber, ethers } from "ethers";
import { Args, Context } from "../types";
import { logAndComment, throwError } from "../utils/logger";
import { NetworkId, RPCHandler } from "@ubiquity-dao/rpc-handler";

function isEthAddress(address: string) {
  if (!address) return false;
  return /^0x[a-fA-F0-9]{40}$/.test(address.trim());
}

export async function faucet(context: Context, args: Args) {
  const { config } = context;
  const { recipient, networkId, amount } = args;

  if (!isEthAddress(recipient)) {
    return throwError("Invalid recipient address", { recipient });
  }

  if (!networkId) {
    return throwError("Network ID must be provided", { networkId });
  }

  if (!amount) {
    return throwError("Amount must be provided", { amount });
  }

  const wallet = await getWalletSigner(config.fundingWalletPrivateKey, networkId);
  const tx = await handleTransfer(context, wallet, recipient, amount);

  if (tx) {
    context.logger.info(`Successfully sent ${amount} to ${recipient} on network ${networkId}`);
    return tx;
  }

  return null;
}

export async function handleTransfer(context: Context, wallet: ethers.Wallet, recipient: string, value: bigint) {
  try {
    const tx: ethers.providers.TransactionResponse = await wallet.sendTransaction({ to: recipient, value: BigNumber.from(value) });
    return tx?.hash ? await wallet.provider?.waitForTransaction(tx.hash) : null;
  } catch (err) {
    throw await logAndComment(context, "error", "Failed to send transaction", {
      err,
      recipient,
      success: false,
      value: ethers.BigNumber.from(value).toString(),
    });
  }
}

export async function getRpcProvider(networkId: NetworkId) {
  const rpcHandler = new RPCHandler({
    autoStorage: false,
    cacheRefreshCycles: 1,
    networkId: networkId,
    networkName: null,
    networkRpcs: null,
    rpcTimeout: 1000,
    runtimeRpcs: null,
    tracking: "yes",
    proxySettings: {
      logger: null,
      logTier: "error",
      retryCount: 3,
      retryDelay: 50,
      strictLogs: true,
    },
  });

  const provider = await rpcHandler.getFastestRpcProvider();
  return new ethers.providers.JsonRpcProvider(provider.connection.url);
}

export async function getWalletSigner(privateKey: string, networkId: string) {
  const id = networkId === "31337" ? "1337" : networkId;
  const rpcProvider = await getRpcProvider(id as NetworkId);
  return new ethers.Wallet(privateKey, rpcProvider);
}
