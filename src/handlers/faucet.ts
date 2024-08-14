import { BigNumber, ethers } from "ethers";
import { Args, Context } from "../types";
import { logAndComment, throwError } from "../utils/logger";
import { NetworkId, RPCHandler } from "@ubiquity-dao/rpc-handler";
import { register } from "./register";

function isEthAddress(address: string) {
  if (!address) return false;
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

export async function faucet(context: Context, args: Args) {
  const { config, storage } = context;
  const { recipient, networkId, amount, token } = args;

  const userWallet = storage.getUserStorage(recipient);
  if (!userWallet.wallet) {
    return await register(context as Context<"issue_comment.created">, args);
  }

  let value = amount || BigInt(0);
  const isNative = token === "native";
  const isWithoutTokenAndAmount = !(amount || token);
  const isWithRecipientAndNetwork = recipient && networkId;
  const isDefaultNative = isWithoutTokenAndAmount && isWithRecipientAndNetwork;

  if (isNative || isDefaultNative) {
    /**
     * "/faucet <recipient> <networkId> <amount> <token>"
     * OR
     * "/faucet <recipient> <networkId>"
     */

    if (value && value === BigInt(0) && config?.nativeGasToken) {
      value = config.nativeGasToken;
    }
  } else if (isWithRecipientAndNetwork && token && isEthAddress(token)) {
    /**
     * "/faucet <recipient> <networkId> <amount> <token>"
     */
    if (value && value === BigInt(0) && config.distributionTokens?.[token]) {
      value = config.distributionTokens[token];
    }
  } else {
    return throwError(`Incorrect arguments provided:`, { recipient, networkId, amount, token });
  }

  if (!value || value <= BigInt(0)) {
    return throwError("Invalid amount");
  }
  const wallet = await getWalletSigner(config.fundingWalletPrivateKey, networkId);
  const transfer = await handleTransfer(context, wallet, userWallet.wallet, value, isNative, token);

  if (transfer) {
    userWallet.claimed++;
    userWallet.lastClaim = new Date();
    storage.setUserStorage(recipient, userWallet);
  }

  return transfer;
}

export async function handleTransfer(context: Context, wallet: ethers.Wallet, recipient: string, value: bigint, isNative: boolean, token?: string) {
  try {
    let tx: ethers.providers.TransactionResponse | null = null;

    if (isNative) {
      tx = await wallet.sendTransaction({ to: recipient, value: BigNumber.from(value) });
    } else if (token) {
      const contract = new ethers.Contract(token, ["function transfer(address to, uint256 value)"], wallet.provider);
      tx = await contract.transfer(recipient, value);
    } else {
      throwError("Token address must be provided for non-native transfers", { recipient, value, isNative, token });
    }

    return tx?.hash ? await wallet.provider?.waitForTransaction(tx.hash) : null;
  } catch (err) {
    throw await logAndComment(context, "error", "Failed to send transaction", {
      err,
      recipient,
      isNative,
      token,
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
