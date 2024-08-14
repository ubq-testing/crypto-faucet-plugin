# `@ubiquibot/crypto-faucet-plugin`

#### What is this plugin for?

This plugin is used to subsidize first-time contributors to Ubiquity by providing them with some funds for their first reward claim.

#### How does it work?

This plugin is a faucet that can be used to distribute funds to users. It can be configured to distribute native gas tokens or any other ERC20 tokens.

#### Features

- configurable settings:
  - `howManyTimesUserCanClaim` - The number of times a user can claim funds from the faucet.
  - `fundingWalletPrivateKey` - The private key of the wallet that will be used to distribute funds. This should be separate from any main funding wallet.
  - `nativeGasToken` - The amount of native gas tokens to distribute to users. If this is defined, only gas tokens will be distributed.
  - `networkIds` - The network IDs on which the faucet will be available.
  - `distributionTokens` - A map of token addresses and amounts to distribute to users. If this is defined, only the specified tokens will be distributed.
- Slash commands:
  - `/register` - Register a new user. Create a storage entry for the user and direct them to safe.ubq.fi to finalize the registration.
  - `/faucet` - A slash command to allow distribution of tokens directly to users. This command can only be used by org admins.
  - - `/faucet <recipient> <networkId> <amount> <token>` - Distribute tokens to a user on a specific network. (use `native` for `token` for gas distribution)
  - - `/faucet <recipient> <networkId> <amount>` - Distribute gas tokens to a user on a specific network.
  - - `/faucet <recipient> <networkId>` - Distribute gas tokens to a user on a specific network.

#### Configuration

```yml
plugins:
  - name: crypto-faucet-plugin
    id: crypto-faucet-plugin
    uses:
      - plugin: http://localhost:4000
        with:
          howManyTimesUserCanClaim: 1
          fundingWalletPrivateKey: 0x...
          nativeGasToken: 100 // in wei. If defined, only gas is distributed
          networkIds:
            - 100
            - 1337
          distributionTokens: // optional, omit for gas only distribution
            "0x...": 100 // in wei
            "0x...": 100 // in wei
```
