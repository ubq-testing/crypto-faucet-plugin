import { SupabaseClient } from "@supabase/supabase-js";
import { Super } from "./supabase";
import { Context } from "../../../types/context";
import { logAndComment } from "../../../utils/logger";

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
      throw logAndComment(this.context, "error", "No wallet address found", { userId, issueNumber });
    } else {
      this.context.logger.info("Successfully fetched wallet", { userId, address: data.wallets?.address });
    }

    return data?.wallets?.address || null;
  }
}
