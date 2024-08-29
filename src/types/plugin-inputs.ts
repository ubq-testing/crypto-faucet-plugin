import { SupportedEvents, SupportedEventsU } from "./context";
import { StaticDecode, Type as T } from "@sinclair/typebox";
import { StandardValidator } from "typebox-validators";

export interface PluginInputs<T extends SupportedEventsU = SupportedEventsU, TU extends SupportedEvents[T] = SupportedEvents[T]> {
  stateId: string;
  eventName: T;
  eventPayload: TU["payload"];
  settings: PluginSettings;
  authToken: string;
  ref: string;
}

export type Args = {
  recipient: string;
  networkId: string;
  amount: bigint;
};

export const pluginSettingsSchema = T.Object({
  /**
   * The private key of the EOA which holds the funds and
   * acts as a "faucet". This wallet should be only be used
   * for this purpose and should be protected.
   */
  fundingWalletPrivateKey: T.String({ pattern: "^0x[a-fA-F0-9]{64}$", minLength: 66, maxLength: 66 }),
  /**
   * The networkIds that the faucet should support. Meaning any network
   * listed here should contain enough funds at the `fundingWalletPrivateKey`
   * address on that network.
   */
  networkId: T.Transform(T.Number({ minimum: 1 }))
    .Decode((v) => v.toString())
    .Encode((v) => parseInt(v)),
  /**
   * The native gas token amount to be sent to the user.
   */
  gasSubsidyAmount: T.BigInt({ minimum: BigInt(0) }),
});

export const pluginSettingsValidator = new StandardValidator(pluginSettingsSchema);

export type PluginSettings = StaticDecode<typeof pluginSettingsSchema>;
