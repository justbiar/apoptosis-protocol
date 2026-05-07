# Apoptosis Protocol

> Programmed Cell Death for the Encrypt Network — An autonomous safety layer that protects user funds when centralized FHE executors go offline.

## Problem Statement

The [Encrypt Network](https://encrypt.xyz) (formerly Ika) brings Fully Homomorphic Encryption (FHE) to Solana. Its architecture has three layers:

| Component | Role | Centralization |
|-----------|------|----------------|
| **Executors** | Perform FHE computations on encrypted data | **Centralized** — require H100 GPUs (~$25K+ each), only well-funded operators can run them |
| **Decryptors** | Threshold decryption (2/3 majority required) | **Decentralized** — MPC nodes collaborating via threshold cryptography |
| **Ika** | Coordinates between Solana ↔ Executors ↔ Decryptors | **Decentralized** — threshold signature network |

### The Core Risk

Executors are inherently centralized because FHE computation demands extreme hardware (NVIDIA H100 GPUs, ~2 million TL each). This creates a **single point of failure**: if executors go offline, crash, or act maliciously, user funds locked in FHE vaults on Solana become inaccessible. Users cannot withdraw because the system depends on executor cooperation.

**Decryptors ARE decentralized** (threshold MPC), but they cannot help users exit if the executor layer is down — they only decrypt data, they don't control vault logic.

## Solution: Apoptosis Protocol

Apoptosis is an **on-chain safety program on Solana** that gives users an autonomous escape hatch when the centralized executor layer fails. Named after the biological process of programmed cell death — when a cell detects something is wrong, it self-destructs in an orderly way to protect the organism.

### How It Works (4 Steps)

```
ACTIVE → SILENT → EMERGENCY → EXIT
  ↑         ↓          ↓         ↓
heartbeats  no signal   vaults    funds
flowing     detected    frozen    returned
```

#### Step 1: Liveness Monitor
- Executor nodes must submit `register_heartbeat()` to the Apoptosis Program on Solana after each computation batch
- The program records `last_seen_slot` (current Solana slot number)
- A configurable `liveness_threshold` (e.g., 150 slots ≈ 60 seconds) defines the acceptable silence window
- Fully transparent — anyone can read the timestamp on-chain

#### Step 2: Emergency Mode (Permissionless Trigger)
- If `current_slot > last_seen_slot + liveness_threshold`, **any user** can call `trigger_emergency()`
- No multisig, no DAO vote, no governance delay — pure math
- Protocol state transitions from `Active → Emergency` atomically
- All Ika vaults are immediately frozen for new deposits
- The triggering account is registered as the bounty recipient

#### Step 3: Escape Hatch (Force Withdraw)
- In Emergency mode, users call `force_withdraw()` directly against their vault PDA
- Vault ownership verified via PDA seeds `[user_pubkey, vault_id]`
- Full vault balance returned to user wallet (SOL, USDC, any SPL token)
- **Ika nodes are completely bypassed** — no executor or decryptor signature needed
- Idempotent — double-calling is safe

#### Step 4: Slash & Bounty
- `slash_executor()` burns a percentage of the offline executor's staked collateral
- Remaining slashed funds go to the bounty pool
- The account that triggered the emergency claims the reward
- Economic incentive: watchers are paid to monitor the network

### Security Properties

| Property | Guarantee |
|----------|-----------|
| **Liveness** | If executors fail, users are never permanently locked out |
| **Censorship Resistance** | `force_withdraw()` requires only a valid Solana keypair — no node can block it |
| **Incentive Alignment** | Reporters are paid to watch; slashing makes attacks economically irrational |

## Architecture

```
┌──────────────────────────────────────────────┐
│         ENCRYPT NETWORK (Off-chain)          │
│                                              │
│  ┌────────────┐  Centralized (H100 GPUs)     │
│  │  EXECUTORS │  FHE computation at scale     │
│  └────────────┘                              │
│        │ register_heartbeat() ──────────┐    │
│  ┌─────────────┐  Decentralized (MPC)   │    │
│  │  DECRYPTORS │  Threshold decryption  │    │
│  └─────────────┘  (2/3 majority)        │    │
│                                         │    │
│  ┌─────────────┐  Decentralized         │    │
│  │     IKA     │  Coordination layer    │    │
│  └─────────────┘                        │    │
└─────────────────────────────────────────┼────┘
                                          │
                                          ▼
┌──────────────────────────────────────────────┐
│              SOLANA MAINNET                  │
│                                              │
│  ┌────────────────────────────────────────┐  │
│  │      APOPTOSIS PROGRAM (Anchor/Rust)  │  │
│  │                                        │  │
│  │  LivenessMonitor PDA → last_seen_slot  │  │
│  │  ProtocolState PDA   → Active|Emergency│  │
│  │  UserVault PDA       → locked_amount   │  │
│  │  ExecutorStake PDA   → collateral      │  │
│  │                                        │  │
│  │  trigger_emergency() ← any user        │  │
│  │  force_withdraw()    ← vault owner     │  │
│  │  slash_executor()    ← punishes nodes  │  │
│  └────────────────────────────────────────┘  │
└──────────────────────────────────────────────┘
```

> Note: `register_heartbeat()` is sent by Executor nodes **directly** to the Apoptosis Program on Solana. Decryptors and Ika are independent layers — they handle decryption and coordination respectively but cannot route vault funds or prevent a force exit.

## Why This Makes Sense

1. **Executor centralization is real** — H100 GPUs cost ~$25K+, only a few operators will run them. This is acknowledged by the Encrypt team themselves.
2. **Decryptors are already decentralized** — They use threshold MPC (2/3 majority). This is good, but insufficient alone — decryptors only handle decryption, not fund access.
3. **No existing escape mechanism** — If executors go offline today, user funds in FHE vaults are stuck. There is no on-chain fallback.
4. **Apoptosis fills this gap** — It's a pure on-chain Solana program that doesn't modify the Encrypt protocol itself, it just adds a safety net around it.
5. **Precedent** — This pattern exists in other protocols: Optimism's fault proofs, Arbitrum's force-inclusion, Ethereum's withdrawal queue. Apoptosis adapts it for FHE.

## Tech Stack

- **Smart Contract**: Rust/Anchor on Solana
- **Frontend**: Vite + React + TypeScript + Tailwind CSS v4 + Framer Motion
- **Design System**: Ciridae (see `design.md`) — dark monochrome, minimal, #CC6437 accent
- **Target**: Superteam Encrypt Bounty 2025

## Project Structure

```
apoptosis-site/
├── src/
│   ├── App.tsx              # Router + LazyMotion wrapper
│   ├── main.tsx             # Entry point
│   ├── components/
│   │   └── Navbar.tsx       # Fixed navigation with scroll glassmorphism
│   └── pages/
│       ├── Home.tsx         # Landing page
│       ├── HowItWorks.tsx   # Technical explainer with animated architecture
│       └── PitchDeck.tsx    # Interactive pitch deck (EN/TR, state machine, slash calculator)
├── app/
│   └── globals.css          # Tailwind @theme tokens, animations, utilities
├── design.md                # Full Ciridae design system reference
└── index.html               # Vite entry
```

## Development

```bash
cd apoptosis-site
npm install
npm run dev          # → http://localhost:5173
npm run build        # Production build
```

## Key Design Decisions

- **Permissionless trigger**: Anyone can call `trigger_emergency()` — no governance bottleneck
- **Economic incentives**: Slash + bounty model ensures rational actors monitor the network
- **PDA-based vaults**: User ownership proven cryptographically via Solana PDA seeds
- **No protocol modification**: Apoptosis is an external safety layer, not a fork of Encrypt
- **Decryptor-friendly**: Decryptors can participate as watchers/reporters and earn bounties
