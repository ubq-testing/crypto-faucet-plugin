import { SupportedEvents, SupportedEventsU } from "./context";
import { StaticDecode, Type as T } from "@sinclair/typebox";
import { StandardValidator } from "typebox-validators";
import { throwError } from "../utils/logger";

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
  amount?: bigint;
  token?: string;
};

export const pluginSettingsSchema = T.Object({
  howManyTimesUserCanClaim: T.Number({ minimum: 1, default: 1 }),
  /**
   * The private key of the EOA which holds the funds and
   * acts as a "faucet". This wallet should be only be used
   * for this purpose and should be protected.
   *
   * TODO: Confirm if it needs encrypted
   */
  fundingWalletPrivateKey: T.String({ pattern: "^0x[a-fA-F0-9]{64}$", minLength: 66, maxLength: 66 }),
  /**
   * The networkIds that the faucet should support. Meaning any network
   * listed here should contain enough funds for any specified token, ERC20 or native
   * at the `fundingWalletPrivateKey` address on that network.
   */
  networkIds: T.Array(
    T.Transform(T.Union([T.String(), T.Number()]))
      .Decode((value) => {
        if (typeof value === "string") {
          const networkId = Number(value);
          if (isNaN(networkId) || networkId <= 0) {
            throwError(`Invalid networkId: ${value}`);
          } else {
            return networkId;
          }
        } else {
          return value;
        }
      })
      .Encode((value) => {
        return value.toString();
      })
  ),
  /**
   * If this is defined then the faucet will only distribute the native gas token
   * (e.g. ETH, MATIC, XDAI, etc...) to the recipients.
   */
  nativeGasToken: T.Optional(T.BigInt({ minimum: BigInt(0) })),
  /**
   * If `nativeGasToken` is not defined then these are the
   * tokens that will be distributed to the recipients.
   *
   * An optional object containing the token address as keys and amounts as values that are
   * to be distributed to the recipients.
   *
   * The amount of tokens to distribute to each recipient
   * in wei. This is the smallest unit of the token.
   *
   * Native gas tokens === 1e18 (1e18 wei = 1 ether = 1 Eth = 1 XDAI = 1 MATIC etc...)
   *
   * https://eth-converter.com/
   */
  distributionTokens: T.Optional(T.Record(T.String(), T.BigInt({ minimum: BigInt(0) }))),
});

export const pluginSettingsValidator = new StandardValidator(pluginSettingsSchema);

export type PluginSettings = StaticDecode<typeof pluginSettingsSchema>;
