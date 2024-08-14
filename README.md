# `@ubiquibot/crypto-faucet-plugin`

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
          networkdIds:
            - 100
            - 1337
          distributionTokens: // optional, omit for gas only distribution
            "0x...": 100 // in wei
            "0x...": 100 // in wei
```
