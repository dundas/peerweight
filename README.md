# PeerWeight Protocol

A Decentralized Trust and Discovery Protocol for the Human Web

## Overview

PeerWeight Protocol creates a decentralized trust mesh through cryptographically signed endorsements. Unlike traditional search engines that optimize for engagement, PeerWeight enables trust-based discovery where each user maintains their own personalized View—a trust graph that returns different results based on who they trust.

## Key Features

- **Decentralized Trust**: No canonical ranking, each user has their own personalized view
- **Cryptographic Integrity**: All endorsements are cryptographically signed
- **Interoperable**: Standards-grade protocol suitable for independent implementations
- **Privacy-Focused**: Users control their own data and trust relationships

## Protocol Primitives

The protocol defines four core primitives:

- **Identity**: Who you are (DID-based identities)
- **Endorsement**: What you recommend
- **Note**: What you think (threaded discussions)
- **View**: Who you trust (personalized trust graph)

## Documentation

### Core Documentation
- [PeerWeight Protocol Specification v1.3.6](./PeerWeight-Protocol-v1.3.6.md) - Full protocol specification
- [Whitepaper](./whitepaper.md) - Research paper on implementation, trust propagation algorithms, Sybil resistance, and AI agent integration (~15,000 words)
- [Implementer Notes](./IMPLEMENTER_NOTES.md) - Implementation guidance and best practices

### Developer Resources
- [AI Agent Quick Start](./AI_AGENT_QUICKSTART.md) - Build a PeerWeight client in 10 minutes
- [JSON Schemas](./schemas/) - Machine-readable schemas for all primitives
- [OpenAPI Spec](./peerweight-aggregator/openapi.yaml) - REST API specification for aggregators
- [llms.txt](./llms.txt) - LLM-optimized protocol summary

## Getting Started

### Installation

```bash
bun install
```

### Running the Aggregator

```bash
cd peerweight-aggregator
bun run src/index.ts
```

## Project Structure

- `PeerWeight-Protocol-v1.3.6.md` - Protocol specification
- `IMPLEMENTER_NOTES.md` - Implementation guidance
- `peerweight-aggregator/` - Reference implementation of an aggregator service

## Links

- Website: [peerweight.org](https://peerweight.org)
- Author: Derivative Labs

## License

Version 1.3.6 - January 2026
