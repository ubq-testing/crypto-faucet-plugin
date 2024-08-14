import { BigNumberish, ethers, Wallet } from "ethers";
import { Context } from "../types";
import { logAndComment, throwError } from "../utils/logger";
import { NetworkId, RPCHandler } from "@ubiquity-dao/rpc-handler";
import { Logs, PrettyLogs } from "@ubiquity-dao/ubiquibot-logger";
import { LogInterface } from "@ubiquity-dao/rpc-handler/dist/types/logs";

type FaucetParams = string[];

export async function faucet(context: Context, args: FaucetParams) {
    const { octokit, payload, config, logger } = context;

    if (args.length === 0) {
        return "No recipients provided";
    }

    const { recipient, networkId, amount, token } = await parseArgs(context, args);
    let value = BigInt(0);
    let isNative = false;

    if (config.nativeGasToken) {
        value = config.nativeGasToken
        isNative = true;
    } else if (config.distributionTokens) {
        value = config.distributionTokens[token];
    } else {
        await logAndComment(context, "error", "No token address provided");
        throwError("No token address provided");
    }

    const wallet = await getWalletSigner(config.fundingWalletPrivateKey, networkId);

    await handleTransfer(context, wallet, recipient, value, isNative, token);

}

export async function handleTransfer(context: Context, wallet: ethers.Wallet, recipient: string, value: BigNumberish, isNative: boolean, token?: string) {
    try {
        let tx: ethers.TransactionLike<string>;

        if (isNative) {
            tx = await wallet.sendTransaction(
                await wallet.populateTransaction({
                    to: recipient,
                    value: value,
                })
            );
        } else if (token) {
            const contract = new ethers.Contract(token, ["function transfer(address to, uint256 value)"], wallet);
            tx = await contract.transfer(recipient, value);
        } else {
            throwError("Token address must be provided for non-native transfers", { recipient, value, isNative, token });
        }

        const fulfilledTx = tx.hash ? await wallet.provider?.waitForTransaction(tx.hash) : null;

        if (fulfilledTx?.status === 1) {
            await logAndComment(context, "info", `Successfully sent ${value} to ${recipient}`);
        } else {
            throwError("Failed to send transaction");
        }
    } catch (error) {
        const log = await logAndComment(context, "error", JSON.stringify(value));
        throwError(log.logMessage.diff);
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
        }
    })

    const provider = await rpcHandler.getFastestRpcProvider();
    return new ethers.JsonRpcProvider(provider.connection.url);
}

export async function getWalletSigner(privateKey: string, networkId: string) {
    const provider = await getRpcProvider(networkId as NetworkId);
    return new ethers.Wallet(privateKey, provider);
}

type Args = {
    recipient: string;
    networkId: string;
    amount: BigInt;
    token: string;
}

async function parseArgs(context: Context, args: string[]): Promise<Args> {
    if (args.length === 4) {
        return {
            recipient: args[0].toLowerCase(),
            networkId: args[1],
            amount: BigInt(args[2]),
            token: args[3].toLowerCase()
        }
    } else {
        await logAndComment(context, "error", "Invalid number of arguments");
        throwError("Invalid number of arguments");
    }
};