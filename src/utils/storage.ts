import manifest from "../../manifest.json";
import { Context } from "../types";
import { throwError } from "./errors";


// TODO: Implement a better structure storage
type StorageLayout = Record<string, unknown>;

export async function saveToStorage(context: Context, data: string) {
    const { octokit, payload } = context;

    try {
        const existing = await fetchStorage(context)
        let parsed: StorageLayout = {};

        if (existing) {
            parsed = JSON.parse(existing);
        }

        const newData = JSON.parse(data);
        Object.assign(parsed, newData);
        data = JSON.stringify(parsed, null, 2);

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

export async function fetchStorage(context: Context) {
    const { octokit, payload } = context;
    try {
        const { data } = await octokit.repos.getContent({
            owner: payload.repository.owner.login,
            repo: "ubiquibot-config",
            path: manifest.name + "-storage.json",
        });
        if ("content" in data) {
            return Buffer.from(data.content, "base64").toString();
        } else {
            throwError("No content found in storage", { data });
        }
    } catch (error) {
        throwError("Failed to fetch data from storage", { error });
    }
}