# PeerWeight Protocol

A Decentralized Trust and Discovery Protocol for the Human Web

**Version:** 1.3.6  
**Date:** January 2026  
**Author:** Derivative Labs  
**Website:** peerweight.org

---

## Abstract

The modern web suffers from a fundamental discovery problem. Search engines optimize for engagement rather than quality. Social platforms trap users in filter bubbles. PeerWeight Protocol addresses this by creating a decentralized trust mesh through cryptographically signed endorsements.

PeerWeight has no canonical ranking. Each user maintains their own View—a personalized trust graph. The same query returns different results for different users based on who they trust.

The protocol defines four primitives: Identity (who you are), Endorsement (what you recommend), Note (what you think), and View (who you trust). These primitives enable trust-based discovery, product reviews, threaded discussions, and social networking—all decentralized and interoperable.

---

## Status of This Document

This document is intended to be a **standards-grade protocol specification** suitable for independent implementations.

This specification is split into:

- **Normative sections** defining protocol primitives, cryptographic rules, well-known endpoints, and conformance requirements.
- **Non-normative sections** providing examples and a reference aggregator API.

Non-normative implementation guidance is provided separately in `IMPLEMENTER_NOTES.md`.

---

## Normative Language

The key words **MUST**, **MUST NOT**, **REQUIRED**, **SHALL**, **SHALL NOT**, **SHOULD**, **SHOULD NOT**, **RECOMMENDED**, **MAY**, and **OPTIONAL** in this document are to be interpreted as described in RFC 2119.

---

## Table of Contents

1. [Conformance](#1-conformance)
2. [Overview](#2-overview)
3. [Cryptography and Canonicalization](#3-cryptography-and-canonicalization)
4. [Identifiers and DID Method](#4-identifiers-and-did-method)
5. [Protocol Primitives](#5-protocol-primitives)
6. [Well-Known Endpoints](#6-well-known-endpoints)
7. [Revocations](#7-revocations)
8. [Personalized Trust Model (Informative)](#8-personalized-trust-model-informative)
9. [Filtering and Client Policy (Informative)](#9-filtering-and-client-policy-informative)
10. [AI Agent Requirements](#10-ai-agent-requirements)
11. [Security Considerations](#11-security-considerations)
12. [Privacy Considerations](#12-privacy-considerations)
13. [Governance and Evolution (Informative)](#13-governance-and-evolution-informative)
14. [Publish Checklist (Normative)](#14-publish-checklist-normative)
15. [Open Issues (Informative)](#15-open-issues-informative)
16. [Appendix A: Reference Aggregator API (Non-Normative)](#appendix-a-reference-aggregator-api-non-normative)
17. [Appendix B: Cryptographic Test Vector (Normative)](#appendix-b-cryptographic-test-vector-normative)

---

# 1. Conformance

PeerWeight defines multiple roles. Implementations MUST declare which role(s) they implement.

## 1.1 Conformance Targets

- **Publisher**: Publishes signed primitives to well-known endpoints.
- **Aggregator**: Crawls, verifies, indexes primitives, and answers queries.
- **Client**: Consumes primitives, verifies signatures, and renders UX.

## 1.2 Publisher Conformance

A conforming Publisher:

- **MUST** publish an identity document at `/.well-known/peerweight/did.json` for domain-based identities.
- **MUST** publish primitives (endorsements, notes, views, revocations) using the schemas in Section 5.
- **MUST** sign all published primitives per Section 3.

## 1.3 Aggregator Conformance

A conforming Aggregator:

- **MUST** fetch and verify signatures for published primitives.
- **MUST** treat Notes as non-ranking per Section 5.4.5.
- **MUST** apply revocations per Section 7.
- **MAY** expose an HTTP API. If exposed, Appendix A provides a reference API, but it is **non-normative**.

## 1.4 Client Conformance

A conforming Client:

- **MUST** verify primitive signatures per Section 3 before treating them as authentic.
- **MAY** implement ranking policies; ranking policy is **client/aggregator policy**, not protocol truth.
- **MUST NOT** treat Notes as ranking signals.

---

# 2. Overview

## 2.1 The Discovery Crisis

The web was designed for human curation. This collapsed under scale. Today's discovery is broken: SEO manipulation, filter bubbles, fake reviews, and AI content flooding.

## 2.2 The PeerWeight Solution

PeerWeight provides four primitives that apps combine to build trust-based experiences:

| Primitive | Purpose | Affects Ranking? |
|---|---|---|
| Identity | Who you are | N/A |
| Endorsement | What you recommend | Yes |
| Note | What you think/say | No |
| View | Who you trust | N/A |

Protocol defines primitives. Clients build experiences.

---

# 3. Cryptography and Canonicalization

## 3.1 Signature Suite

All primitives are signed using `Ed25519Signature2020`.

## 3.2 Canonicalization

Implementations **MUST** canonicalize JSON objects using **JCS (JSON Canonicalization Scheme, RFC 8785)**.

Signing input:

- Remove the top-level `proof` field entirely.
- Canonicalize the remaining object with JCS.
- Encode the canonical JSON as UTF-8 bytes.

## 3.3 Digest

Compute `SHA-256` over the canonical UTF-8 bytes.

## 3.4 Signature

Compute an Ed25519 signature over the SHA-256 digest.

## 3.5 Encoding

The signature **MUST** be encoded as multibase base58btc with a `z` prefix.

Implementations **MUST** use the multibase prefix `z` and the base58btc alphabet as defined by the multiformats specifications.

This specification uses:

```
proofValue = "z" + base58btc(Ed25519Sign(SHA256(JCS(doc_without_proof))))
```

## 3.6 Proof Object

All signed primitives MUST include a `proof` object:

```json
{
  "proof": {
    "type": "Ed25519Signature2020",
    "proofValue": "z..."
  }
}
```

The proof object MAY be extended in the future; unknown proof fields MUST be ignored.

---

# 4. Identifiers and DID Method

PeerWeight uses DIDs to identify issuers.

## 4.1 DID Method Names

PeerWeight identifiers use the method name `peerweight`:

- `did:peerweight:example.com`
- `did:peerweight:bsky:alice.bsky.social`

## 4.2 Domain-Based DID Resolution (Normative)

For a domain-based DID `did:peerweight:{domain}`, the DID document **MUST** be available at:

- `https://{domain}/.well-known/peerweight/did.json`

The DID document **MUST** include at least one Ed25519 verification key.

## 4.2.1 `did.json` Schema (Normative)

A domain-based Publisher MUST serve a JSON document at `/.well-known/peerweight/did.json` with the following minimum fields:

| Field | Required | Description |
|---|---:|---|
| `type` | Yes | `"PeerWeightIdentity"` |
| `did` | Yes | The DID being described (e.g., `did:peerweight:example.com`) |
| `publicKey` | Yes | A verification key object |
| `created` | Yes | ISO 8601 timestamp |
| `updated` | No | ISO 8601 timestamp |

The `publicKey` object MUST contain:

| Field | Required | Description |
|---|---:|---|
| `id` | Yes | Key identifier, recommended: `{did}#key-1` |
| `type` | Yes | `"Ed25519VerificationKey2020"` |
| `publicKeyMultibase` | Yes | Multibase base58btc-encoded Ed25519 public key (prefix `z`) |

Example:

```json
{
  "type": "PeerWeightIdentity",
  "did": "did:peerweight:example.com",
  "publicKey": {
    "id": "did:peerweight:example.com#key-1",
    "type": "Ed25519VerificationKey2020",
    "publicKeyMultibase": "z6Mk..."
  },
  "created": "2026-01-01T00:00:00Z",
  "updated": "2026-01-15T12:00:00Z"
}
```

Publishers MAY rotate keys by publishing a new `did.json`. Clients and Aggregators MUST accept any key currently published in `did.json` when verifying signatures.

## 4.3 Platform-Based DID Linking (Normative)

For non-domain identities (e.g., Bluesky, Mastodon, Nostr, YouTube), the protocol defines a signed link object:

```json
{
  "type": "PeerWeightIdentityLink",
  "issuer": "did:peerweight:example.com",
  "subject": "did:peerweight:bsky:alice.bsky.social",
  "proof": { "type": "Ed25519Signature2020", "proofValue": "z..." }
}
```

A Client or Aggregator MAY verify the platform-based identity by checking that:

- The `issuer` DID is valid and resolvable, and
- The linked platform identity contains (or can produce) a proof that the issuer controls it.

Exact platform-specific posting and verification mechanics are **out of scope** for v1.3.6 and MUST be treated as implementation profiles.

---

# 5. Protocol Primitives

## 5.1 Common Fields

All primitives:

- **MUST** include `type`, `id`, `issuer`, `issued`, `proof`.
- `id` **MUST** be a UUID URN unless otherwise specified.

## 5.2 Endorsement

Signed recommendations that affect trust propagation and ranking.

### 5.2.1 Schema

| Field | Required | Description |
|---|---:|---|
| `type` | Yes | `"PeerWeightEndorsement"` |
| `id` | Yes | UUID URN |
| `issuer` | Yes | DID of endorser |
| `subject` | Yes | Resource endorsed |
| `weight` | Yes | 1-5 strength |
| `disclosure` | Yes | purchased/editorial/gifted/affiliate/paid/partner/self |
| `categories` | Yes | 1-5 category paths |
| `claim` | No | Short summary (280 chars) |
| `review` | No | Long-form (10K chars, markdown allowed) |
| `issued` | Yes | ISO 8601 timestamp |
| `proof` | Yes | Ed25519Signature2020 |
| `is_ai` | No | Boolean flag for AI agent issuers |
| `operator` | No | DID of human operator when `is_ai=true` |

### 5.2.2 Subject Object

| Field | Required | Description |
|---|---:|---|
| `url` | Conditional | Canonicalized URL |
| `id` | Conditional | DID (for domain/profile subjects) |
| `resourceType` | Yes | domain/profile/page/post/product/service/component |
| `product` | No | Product metadata |
| `service` | No | Service metadata |

Exactly one of `url` or `id` MUST be present.

### 5.2.3 Temporal Decay (Policy)

The protocol records `issued` timestamps. Temporal decay is a **ranking policy**. A recommended policy is a 180-day half-life:

```
T(t) = W₀ × 2^(-t/180)
```

### 5.2.4 Category Path Syntax (Normative)

Each entry in `categories` MUST be a slash-delimited path string.

- Categories MUST be lowercase ASCII.
- Categories MUST match the regular expression: `^[a-z0-9]+(/[a-z0-9-]+)*$`.
- Categories SHOULD be stable identifiers (avoid embedding dates or version numbers).

## 5.3 URL Canonicalization

Subject URLs MUST be canonicalized:

- Lowercase scheme and host
- Remove default ports (:80, :443)
- Remove trailing slash (except root)
- Sort query parameters alphabetically
- Remove tracking params (`utm_*`, `fbclid`, `gclid`)

## 5.4 Note

Notes enable conversation and annotation and MUST NOT affect ranking.

### 5.4.1 Schema

| Field | Required | Description |
|---|---:|---|
| `type` | Yes | `"PeerWeightNote"` |
| `id` | Yes | UUID URN |
| `issuer` | Yes | DID of author |
| `subject` | No | What this note is about |
| `replyTo` | No | Parent note ID |
| `text` | Yes | UTF-8 text (max 10,000) |
| `issued` | Yes | ISO 8601 timestamp |
| `proof` | Yes | Ed25519Signature2020 |

### 5.4.2 Subject Object

Same as Endorsement subject. `selector` is reserved for future inline annotations.

### 5.4.3 Subject/ReplyTo Rules

At least one of `subject` or `replyTo` MAY be absent:

- Both absent → standalone post
- `subject` only → comment on entity
- `replyTo` only → reply inherits subject from parent
- Both present → reply with explicit subject override

### 5.4.4 Threading

Notes support threading via `replyTo`.

- Cycles are invalid: a note MUST NOT reply to itself or create circular chains.
- If parent is unresolvable, clients MUST treat as an orphan reply.

### 5.4.5 Non-Ranking Rule (Normative)

- Notes MUST NOT contribute to trust propagation or ranking scores.
- Aggregators MUST NOT treat note volume, replies, or engagement as ranking signals.

## 5.5 View

A View is a signed configuration of trust anchors.

### 5.5.1 Schema

```json
{
  "type": "PeerWeightView",
  "id": "did:peerweight:views:indie-cooking",
  "name": "Indie Cooking",
  "maintainer": "did:peerweight:foodbloggers.bsky.social",
  "anchors": [
    { "did": "did:peerweight:seriouseats.com", "weight": 5 },
    { "did": "did:peerweight:bsky:kenji", "weight": 5 }
  ],
  "visibility": "public",
  "created": "2026-01-15T00:00:00Z",
  "proof": { "type": "Ed25519Signature2020", "proofValue": "z..." }
}
```

### 5.5.2 Subscription (Informative)

Users subscribe to Views to bootstrap their trust graph. Subscription copies anchors. Users may fork, customize, or accept updates.

---

# 6. Well-Known Endpoints

All PeerWeight data is discoverable via well-known endpoints:

| Endpoint | Format | Content |
|---|---|---|
| `/.well-known/peerweight/did.json` | JSON | Identity document |
| `/.well-known/peerweight/endorsements.json` | JSON | Endorsement collection |
| `/.well-known/peerweight/notes.jsonl` | JSONL | Notes (one per line) |
| `/.well-known/peerweight/revocations.json` | JSON | Revocation list |
| `/.well-known/peerweight/views.json` | JSON | Published Views |

## 6.1 Notes Endpoint Rotation (Recommended)

- `notes.jsonl` (current)
- `notes-YYYY.jsonl` (archived)

Pagination MAY be implemented using:

- `?since=2026-01-01T00:00:00Z&limit=100`

---

# 7. Revocations

Endorsements and Notes are immutable once published. To retract, issuers publish a signed revocation list.

## 7.1 RevocationList Schema

```json
{
  "type": "RevocationList",
  "issuer": "did:peerweight:alice.com",
  "updated": "2026-02-01T00:00:00Z",
  "revoked": [
    { "id": "urn:uuid:endorsement-id", "type": "endorsement", "reason": "Product quality declined" },
    { "id": "urn:uuid:note-id", "type": "note", "reason": "Posted in error" }
  ],
  "proof": { "type": "Ed25519Signature2020", "proofValue": "z..." }
}
```

## 7.2 Revocation Handling

- Aggregators MUST exclude revoked items from default responses.
- Clients MAY display revoked items in audit mode.

---

# 8. Personalized Trust Model (Informative)

PeerWeight has no global truth. The same URL yields different scores for different users based on their trust anchors.

---

# 9. Filtering and Client Policy (Informative)

Users may apply filters:

- Source filtering
- Threshold filtering
- Disclosure filtering
- Correlation filtering
- Note filtering

---

# 10. AI Agent Requirements

AI agents MUST disclose via `is_ai: true` and `operator` DID.

- Agents MAY suggest endorsements.
- Agents MUST NOT publish endorsements without explicit human approval.
- Agents MAY publish notes, but SHOULD disclose that they are AI-authored in note text or metadata.

---

# 11. Security Considerations

- Implementations MUST verify signatures before trusting content.
- Key compromise requires revocation and key rotation.
- Aggregators SHOULD rate-limit abusive endpoints and high-volume note spam.

---

# 12. Privacy Considerations

- Published notes and endorsements are public.
- User trust graphs (anchors, filters) SHOULD be local/private by default.
- Aggregators MAY log queries; users SHOULD assume queries are traceable.

---

# 13. Governance and Evolution (Informative)

Open standard. Rough consensus (IETF/W3C model). Category ontology via PWIPs.

---

# 14. Publish Checklist (Normative)

Before claiming conformance to this specification, an implementation SHOULD verify:

- **Publisher**
  - Publishes `/.well-known/peerweight/did.json` for domain-based DIDs (Section 4.2.1)
  - Publishes `endorsements.json`, `notes.jsonl`, `views.json`, `revocations.json` in the formats described
  - Signs all published objects and excludes `proof` during signing
- **Aggregator**
  - Verifies signatures before indexing
  - Applies revocations to default query responses (Section 7.2)
  - Enforces the non-ranking rule for Notes
  - Documents any ranking/decay policy as *policy*, not protocol truth
- **Client**
  - Verifies signatures before display
  - Treats Notes as non-ranking
  - Clearly surfaces disclosure types alongside endorsements

---

# 15. Open Issues (Informative)

The following areas are intentionally left as implementation profiles or future work in v1.3.6:

- **Platform identity linking**
  - Exact posting/verification mechanics for Bluesky/Mastodon/Nostr/YouTube are out of scope.
- **Category ontology**
  - This spec does not define a canonical registry; governance is via PWIPs.
- **Reference API standardization**
  - Appendix A is a reference API. If the ecosystem converges on a stable interface, it can be standardized in a future version.

---

# Appendix A: Reference Aggregator API (Non-Normative)

This appendix describes a reference API design for aggregators. It is NOT required for protocol conformance.

- `POST /v1/register`
- `POST /v1/lookup`
- `POST /v1/discover`
- `GET /v1/notes?subject={url}`
- `POST /v1/notes/feed`

---

# Appendix B: Cryptographic Test Vector (Normative)

This test vector is provided to enable cross-implementation verification of canonicalization, hashing, and signing.

## B.1 Canonical JSON (Endorsement without `proof`)

```json
{"categories":["commerce/kitchen/knives"],"disclosure":"purchased","id":"urn:uuid:550e8400-e29b-41d4-a716-446655440000","issued":"2026-01-15T12:00:00Z","issuer":"did:peerweight:example.com","subject":{"resourceType":"product","url":"https://amazon.com/dp/B00005MEGG"},"type":"PeerWeightEndorsement","weight":5}
```

## B.2 SHA-256 Digest (hex)

```
ed92548f21844d77f9bcf75aa2448f8aa6d9e573c2259de2baa7833ff62ab1fd
```

## B.3 Public Key (multibase base58btc)

```
z5WcE8o73vmsSZXeeWTLm3ty3fAJKCnBWRF6VuKUme5nu
```

## B.4 Signature (multibase base58btc)

```
z3aefja3LgJ9548tAfLxgvAH6TWWHbx1BkBM2AFqT4Gx93NYF5cc552G4GXu63s1kdDmc5ifiAAmiF2qsaXhwT9ip
```
