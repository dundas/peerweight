# PeerWeight Implementer Notes (Non-Normative)

This document provides **non-normative** guidance for implementers of PeerWeight.

The normative specification is:

- `PeerWeight-Protocol-v1.3.6.md`

If there is any conflict between this document and the protocol specification, the protocol specification controls.

---

## 1. Roles and What “Compliance” Means

PeerWeight implementations generally fall into three roles.

### 1.1 Publisher

A Publisher is an identity that hosts well-known endpoints and publishes signed primitives.

**Minimum Publisher responsibilities:**

- Publish `/.well-known/peerweight/did.json` (for domain-based DIDs)
- Publish `endorsements.json`, `notes.jsonl`, `views.json`, `revocations.json`
- Sign every published object (excluding the `proof` field during signing)

### 1.2 Aggregator

An Aggregator crawls well-known endpoints, verifies signatures, indexes data, and answers queries.

**Minimum Aggregator responsibilities:**

- Verify signatures before indexing
- Enforce the **non-ranking rule**: Notes do not affect ranking
- Apply revocations: revoked objects must not appear in default responses
- Treat ranking and scoring as *policy* (not protocol truth)

### 1.3 Client

A Client is any application that consumes PeerWeight primitives.

**Minimum Client responsibilities:**

- Verify signatures before displaying content as authentic
- Display disclosure types prominently
- Never treat Notes as ranking signals

---

## 2. Protocol vs. Policy (Common Confusion)

PeerWeight is intentionally minimal. Many behaviors that look like “part of the protocol” are actually **policy choices**.

### 2.1 Protocol Truth

The protocol defines:

- Object schemas (endorsement, note, view, revocation)
- How identities are represented and where domain identities publish key material
- How objects are signed and verified
- The requirement that Notes MUST NOT affect ranking

### 2.2 Policy (Implementation Choice)

Implementations choose:

- How to compute trust scores
- Whether and how to apply temporal decay
- How to aggregate multiple endorsements (median/mean/harmonic)
- How to filter or prioritize disclosures
- Abuse controls (rate limits, spam filtering)

When you publish an Aggregator or Client, it helps interoperability to explicitly document:

- Ranking formula
- Filters applied by default
- Any thresholds or truncation depth for graph traversal

---

## 3. Identity: Practical Notes

### 3.1 Serving `did.json`

- Make it cache-friendly (ETag/Last-Modified). Aggregators may crawl frequently.
- Key rotation should be treated like DNS/HTTPS rotation: publish the new key, keep old key temporarily if needed, then remove.

### 3.2 Key IDs

Use stable key IDs like:

- `did:peerweight:example.com#key-1`

If you rotate keys frequently, you can increment `#key-2`, etc.

---

## 4. Notes: Storage and Pagination

Notes can become large. JSONL is used to enable streaming and incremental ingestion.

Practical suggestions:

- Keep `notes.jsonl` bounded (rotate into `notes-YYYY.jsonl`)
- Support `since` + `limit` as recommended by the protocol
- When a reply uses `replyTo` only, aggregators/clients should resolve the parent and inherit its subject

---

## 5. Revocations: Operational Guidance

Revocations are the mechanism for “retraction” without mutating history.

Practical suggestions:

- Treat revocations as a *default filter* (exclude revoked items unless explicitly requested)
- Preserve revoked objects internally for audit/debugging
- If a key is compromised, rotate keys and revoke affected objects if necessary

---

## 6. Cryptography: How to Validate Your Implementation

### 6.1 Signing Steps

At a high level:

- Remove `proof`
- Canonicalize using JCS
- SHA-256 digest
- Ed25519 signature over the digest
- Encode signature as multibase base58btc with `z` prefix

### 6.2 Use the Test Vector

The protocol includes a cryptographic test vector in:

- `PeerWeight-Protocol-v1.3.6.md` → Appendix B

A good implementation practice:

- Write a unit test that:
  - Loads the canonical JSON string
  - Computes the expected SHA-256
  - Verifies that the provided signature validates under the provided public key

If your verification fails, the most common causes are:

- Not using JCS canonicalization
- Signing the raw JSON bytes instead of the SHA-256 digest
- Accidentally including `proof` in the signed payload
- Using the wrong base58 alphabet

---

## 7. Minimal Interop Checklist

Before claiming “works with other PeerWeight implementations,” verify:

- Two independent implementations can verify each other’s signatures
- Aggregator excludes revoked objects by default
- Notes never change ranking, regardless of volume
- Domain-based DID resolution works for a third-party domain you do not control
