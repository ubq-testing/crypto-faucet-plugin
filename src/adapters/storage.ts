import manifest from "../../manifest.json";
import { Context } from "../types";
import { throwError } from "../utils/logger";

type UserStorage = { claimed: number, lastClaim: Date | null };
type StorageLayout = Record<string, UserStorage>;

export class Storage {
    context: Context;
    data: StorageLayout;
    static instance: Storage;

    constructor(context: Context) {
        this.context = context;
        this.data = {};
    }

    static async getInstance(context: Context) {
        if (!this.instance) {
            this.instance = new Storage(context);
        }
        await this.instance.load();
        return this.instance;
    }

    static async create(context: Context) {
        const instance = new Storage(context);
        await instance.load();
        return instance;
    }

    async load() {
        const data = await this.fetchStorage(this.context);
        if (data) {
            this.data = JSON.parse(data);
        } else {
            // TODO: Maybe write a new file although seems dangerous, needs better handling
            throwError("No data found in storage");
        }
    }

    async save(newData: UserStorage) {
        const data = JSON.stringify(newData, null, 2);
        await this.saveToStorage(this.context, data);
    }

    get(username: string) {
        return this.data[username];
    }

    set(username: string, userData: UserStorage) {
        this.data[username] = userData;
    }

    /**
     * Assumes all data has been handled and is ready to be saved,
     * does not handle any data manipulation or safety checks
     */
    async saveToStorage(context: Context, data: string) {
        const { octokit, payload } = context;

        try {
            await octokit.repos.createOrUpdateFileContents({
                owner: payload.repository.owner.login,
                repo: "ubiquibot-config",
                path: manifest.name + "-storage.json",
                message: "feat: save data",
                content: Buffer.from(data).toString("base64"),
            })
        } catch (error) {
            throwError("Failed to save data to storage", { error });
        }
    }

    /**
     * Fetches the storage file from the repository
     * and returns the StorageLayout object
     */
    async fetchStorage(context: Context) {
        const { octokit, payload } = context;
        try {
            const { data } = await octokit.repos.getContent({
                owner: payload.repository.owner.login,
                repo: "ubiquibot-config",
                path: manifest.name + "-storage.json",
            });
            if ("content" in data) {
                const content = Buffer.from(data.content, "base64").toString();
                return JSON.parse(content);
            } else {
                throwError("No content found in storage", { data });
            }
        } catch (error) {
            throwError("Failed to fetch data from storage", { error });
        }
    }
}

