import { db } from './core/db';
import { verifyObject } from './core/crypto';
import { EndorsementSchema, NoteSchema } from './core/models';
import { z } from 'zod';

// Minimal schema for did.json fetching
const DIDDocumentSchema = z.object({
  id: z.string().optional(), // standard DID doc field, sometimes 'id', sometimes 'did' in our loose spec example
  did: z.string().optional(), // PeerWeight spec example uses 'did'
  publicKey: z.object({
    id: z.string(),
    type: z.literal('Ed25519VerificationKey2020'),
    publicKeyMultibase: z.string(),
  }),
});

export async function crawlDomain(domain: string) {
  console.log(`[Crawler] Starting crawl for: ${domain}`);
  const protocol = 'https://';
  const baseUrl = `${protocol}${domain}/.well-known/peerweight`;

  // 1. Fetch Identity (DID)
  let publicKeyMultibase = '';
  let did = '';

  try {
    const didUrl = `${baseUrl}/did.json`;
    console.log(`[Crawler] Fetching Identity: ${didUrl}`);
    const res = await fetch(didUrl);
    if (!res.ok) throw new Error(`Failed to fetch did.json: ${res.status}`);

    const json = await res.json();
    const doc = DIDDocumentSchema.parse(json);

    // Support both standard 'id' and our example 'did'
    did = doc.did || doc.id || '';
    if (!did) throw new Error('DID document missing "did" or "id" field');

    publicKeyMultibase = doc.publicKey.publicKeyMultibase;

    // Upsert Identity
    await db.identities.upsert({
      did,
      domain,
      public_key_multibase: publicKeyMultibase,
      last_crawled: new Date().toISOString(),
    });

    console.log(`[Crawler] Identity verified: ${did}`);

  } catch (err) {
    console.error(`[Crawler] Identity fetch failed for ${domain}:`, err);
    return; // Abort if identity fails
  }

  // 2. Fetch Endorsements
  try {
    const endUrl = `${baseUrl}/endorsements.json`;
    console.log(`[Crawler] Fetching Endorsements: ${endUrl}`);
    const res = await fetch(endUrl);

    if (res.ok) {
      const collection = await res.json();
      if (Array.isArray(collection)) {
        let count = 0;
        for (const item of collection) {
          // Verify Signature
          if (!verifyObject(item, publicKeyMultibase)) {
            console.warn(`[Crawler] Invalid signature for endorsement ${item.id}`);
            continue;
          }

          // Verify Schema
          const parsed = EndorsementSchema.safeParse(item);
          if (!parsed.success) {
            console.warn(`[Crawler] Invalid schema for endorsement ${item.id}`, parsed.error);
            continue;
          }

          const end = parsed.data;

          // Check if already exists (skip duplicates)
          const exists = await db.endorsements.exists(end.id);
          if (exists) continue;

          // Insert Endorsement
          await db.endorsements.insert({
            id: end.id,
            issuer: end.issuer,
            subject_url: end.subject.url || undefined,
            subject_id: end.subject.id || undefined,
            weight: end.weight,
            disclosure: end.disclosure,
            categories: end.categories,
            claim: end.claim || undefined,
            issued: end.issued,
            proof_value: end.proof?.proofValue || undefined,
          });
          count++;
        }
        console.log(`[Crawler] Processed ${count} endorsements.`);
      }
    } else if (res.status !== 404) {
      console.warn(`[Crawler] Failed to fetch endorsements: ${res.status}`);
    }
  } catch (err) {
    console.error(`[Crawler] Endorsement crawl error:`, err);
  }

  // 3. Fetch Notes (JSONL)
  try {
    const notesUrl = `${baseUrl}/notes.jsonl`;
    console.log(`[Crawler] Fetching Notes: ${notesUrl}`);
    const res = await fetch(notesUrl);

    if (res.ok) {
      const text = await res.text();
      const lines = text.split('\n');
      let count = 0;

      for (const line of lines) {
        if (!line.trim()) continue;

        try {
          const item = JSON.parse(line);

          if (!verifyObject(item, publicKeyMultibase)) continue;

          const parsed = NoteSchema.safeParse(item);
          if (!parsed.success) continue;

          const note = parsed.data;

          // Check if already exists (skip duplicates)
          const exists = await db.notes.exists(note.id);
          if (exists) continue;

          await db.notes.insert({
            id: note.id,
            issuer: note.issuer,
            subject_url: note.subject?.url || undefined,
            subject_id: note.subject?.id || undefined,
            reply_to: note.replyTo || undefined,
            text: note.text,
            issued: note.issued,
            proof_value: note.proof?.proofValue || undefined,
          });
          count++;
        } catch (e) {
          // Skip malformed lines
        }
      }
      console.log(`[Crawler] Processed ${count} notes.`);
    }
  } catch (err) {
    console.error(`[Crawler] Note crawl error:`, err);
  }
}
