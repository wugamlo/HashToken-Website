---
name: Free Ethereum RPC limits
description: Constraints of the free public RPCs used for HashToken mint indexing
---

- Free providers (publicnode, cloudflare-eth, flashbots, llamarpc) reject batched JSON-RPC calls and archive-range `eth_getLogs`; keep `batchMaxCount: 1`, `staticNetwork`, log ranges ≤ ~750 blocks, and fetch only block timestamps (no per-tx lookups) during sync.
- publicnode returns 403 "Archive requests require a personal token" for old block ranges — old-history recovery needs an archive-capable provider/API key.
- Ethers `JsonRpcProvider` instances must be `destroy()`ed on failover or they keep retrying network detection forever, spamming logs.

**How to apply:** any change to the mint indexer's fetch strategy must respect these limits; recent-tip capture, forward gap fill, and backward history recovery run as three independent checkpointed cursors so one failing provider never blocks the others.
