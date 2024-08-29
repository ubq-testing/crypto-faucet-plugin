import { SupabaseClient } from "@supabase/supabase-js";
import { Super } from "./supabase";
import { Context } from "../../../types/context";

type Wallet = {
  address: string;
};

export class User extends Super {
  constructor(supabase: SupabaseClient, context: Context) {
    super(supabase, context);
  }

  async hasClaimedBefore(userId: number) {
    const { data, error } = await this.supabase.from("permits").select("id").eq("beneficiaryId", userId).single();

    if (error) {
      this.context.logger.error("Error fetching permit", { userId });
      throw new Error("Error fetching permit");
    }

    return !!data?.id;
  }

  async getWalletByUserId(userId: number, issueNumber: number) {
    const { data, error } = (await this.supabase.from("users").select("wallets(*)").eq("id", userId).single()) as { data: { wallets: Wallet }; error: unknown };
    if ((error && !data) || !data.wallets?.address) {
      const log = this.context.logger.error("No wallet address found", { userId, issueNumber });
      await addCommentToIssue(this.context, log.logMessage.diff);
    } else {
      this.context.logger.info("Successfully fetched wallet", { userId, address: data.wallets?.address });
    }

    return data?.wallets?.address || null;
  }
}

async function addCommentToIssue(context: Context, message: string) {
  const { payload, octokit } = context;
  const {
    repository: { full_name },
    issue,
  } = payload;

  if (!full_name) {
    context.logger.error("No issue found to comment on");
    return;
  }

  const [owner, repo] = full_name.split("/");

  try {
    await octokit.rest.issues.createComment({
      owner,
      repo,
      issue_number: issue.number,
      body: message,
    });
  } catch (e) {
    context.logger.error("Error adding comment to issue", { owner, repo, issue_number: issue.number });
  }
}
