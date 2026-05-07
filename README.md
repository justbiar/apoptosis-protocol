# Apoptosis Protocol

**Programmed cell death for the Encrypt network** — an autonomous on-chain safety layer that protects user funds when centralized FHE executors go offline.

Submission for the [Superteam Encrypt / Ika Bounty](https://superteam.fun/earn/listing/encrypt-ika-frontier-april-2026).

---

## The Problem

[Encrypt](https://encrypt.xyz) brings Fully Homomorphic Encryption (FHE) to Solana. Its executor layer runs on NVIDIA H100 GPUs (~$25K+ each), which means only well-funded operators can run them. This creates a **single point of failure**: if executors go offline, crash, or act maliciously, user funds locked in FHE vaults on Solana become inaccessible with no on-chain exit path.

Encrypt's Decryptors are decentralized (2/3 threshold MPC) — but they only handle decryption. They cannot route vault funds. When the executor layer fails, there is currently no escape mechanism.

---

## The Solution

Apoptosis is an **independent Solana program** that wraps the Encrypt network with a trustless escape hatch. It does not fork or modify the Encrypt protocol.

```
ACTIVE → SILENT → EMERGENCY → EXIT
  ↑         ↓          ↓         ↓
heartbeats  no signal   vaults    funds
flowing     detected    frozen    returned
```

### Four on-chain primitives

| Step | Instruction | Who calls it | What it does |
|------|-------------|--------------|--------------|
| 1 | `register_heartbeat()` | Executor nodes | Records `last_seen_slot` on-chain after each computation batch |
| 2 | `trigger_emergency()` | Any Solana account | Fires if `current_slot > last_seen_slot + liveness_threshold` — no governance required |
| 3 | `force_withdraw()` | Vault owner | Returns full vault balance directly to user wallet — no Ika/Encrypt signature needed |
| 4 | `slash_executor()` | Any Solana account | Burns offline executor stake; remainder goes to the bounty pool |

### Security guarantees

- **Liveness** — users are never permanently locked out if executors fail
- **Censorship resistance** — `force_withdraw()` requires only a valid Solana keypair
- **Incentive alignment** — reporters earn a bounty for triggering; slashing makes attacks economically irrational

---

## Architecture

Executor nodes send `register_heartbeat()` **directly** to the Apoptosis Program on Solana. Decryptors and Ika are independent layers — they handle decryption and coordination respectively, and are not in the heartbeat path.

```
Off-chain:  EXECUTORS ──register_heartbeat()──▶  APOPTOSIS PROGRAM (Solana)
            DECRYPTORS (MPC, independent)
            IKA (coordination, independent)

On-chain PDAs:
  LivenessMonitor  →  last_seen_slot, liveness_threshold
  ProtocolState    →  Active | Emergency
  UserVault        →  locked_amount, withdrawn_in_emergency
  ExecutorStake    →  collateral, slashed
```

---

## Why This Fits the Bounty

**Encrypted Capital Markets** — Apoptosis directly addresses the executor centralization risk that makes FHE-based capital markets unsafe for users.

**Bridgeless Capital Markets** — Ika enables Solana to control assets on other chains without bridges. Apoptosis applies the same liveness guarantee to those cross-chain vaults — one protocol, all Ika-powered chains.

This escape-hatch pattern is established in the broader ecosystem: Optimism's fault proofs, Arbitrum's force-inclusion, Ethereum's validator withdrawal queue. Apoptosis adapts it for FHE coprocessor networks.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Smart contract | Rust / Anchor (Solana) |
| Frontend | Vite + React 19 + TypeScript |
| Styling | Tailwind CSS v4 |
| Animation | Framer Motion 12 |

---

## Local Development

```bash
npm install
npm run dev      # → http://localhost:5173
npm run build    # production build
```

---

## Sources

- **REFHE: Fully Homomorphic ALU** (dWallet Labs, Eurocrypt 2026) — establishes why FHE computation requires H100-class hardware (`sources.pdf`)
- **Threshold FHE with Efficient Asynchronous Decryption** — explains why the Decryptor network handles decryption only and cannot route funds (`source2.pdf`)
