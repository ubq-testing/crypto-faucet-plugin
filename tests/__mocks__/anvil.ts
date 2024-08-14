import { NetworkId, RPCHandler } from "@ubiquity-dao/rpc-handler";
import { spawnSync } from "child_process";

class Anvil {
    rpcs: string[] = [];
    rpcHandler: RPCHandler | null = null;
    networkId: NetworkId = "1337"

    async init() {
        this.rpcHandler = new RPCHandler({
            autoStorage: false,
            cacheRefreshCycles: 3,
            networkId: "100",
            networkName: "gnosis",
            rpcTimeout: 5000,
            runtimeRpcs: null,
            networkRpcs: null,
            proxySettings: {
                logger: null,
                logTier: "ok",
                retryCount: 3,
                retryDelay: 100,
                strictLogs: true,
                moduleName: "TestModule",
            },
        });
        await this.rpcHandler.testRpcPerformance();
        const latencies: Record<string, number> = this.rpcHandler.getLatencies();
        const sorted = Object.entries(latencies).sort(([, a], [, b]) => a - b);
        this.rpcs = sorted.map(([rpc]) => rpc.split("__")[1]);
    }

    async run() {
        await this.init();
        console.log(`Starting Anvil...`);
        const isSuccess = await this.spawner(this.rpcs.shift());

        if (!isSuccess) {
            throw new Error(`Anvil failed to start`);
        }
    }

    async spawner(rpc?: string): Promise<boolean> {
        if (!rpc) {
            console.log(`No RPCs left to try`);
            return false;
        }

        console.log(`Forking with RPC: ${rpc}`);

        const anvil = spawnSync("anvil", ["--chain-id", "1337", "--fork-url", rpc, "--host", "127.0.0.1", "--port", "8545"], {
            stdio: "inherit",
        });

        if (anvil.status !== 0) {
            console.log(`Anvil failed to start with RPC: ${rpc}`);
            console.log(`Retrying with next RPC...`);
            return this.spawner(this.rpcs.shift());
        }

        return true;
    }
}

async function main() {
    const anvil = new Anvil();
    await anvil.run();
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});