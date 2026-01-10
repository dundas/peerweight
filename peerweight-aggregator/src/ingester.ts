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
    db.query(`
      INSERT INTO identities (did, domain, public_key_multibase, last_crawled)
      VALUES ($did, $domain, $pk, $now)
      ON CONFLICT(did) DO UPDATE SET
        public_key_multibase = excluded.public_key_multibase,
        last_crawled = excluded.last_crawled
    `).run({
      $did: did,
      $domain: domain,
      $pk: publicKeyMultibase,
      $now: new Date().toISOString()
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
          
          // Upsert Endorsement
          db.query(`
            INSERT OR REPLACE INTO endorsements 
            (id, issuer, subject_url, subject_id, weight, disclosure, categories, claim, issued, proof_value)
            VALUES ($id, $issuer, $sUrl, $sId, $weight, $disc, $cats, $claim, $issued, $proof)
          `).run({
            $id: end.id,
            $issuer: end.issuer,
            $sUrl: end.subject.url || null,
            $sId: end.subject.id || null,
            $weight: end.weight,
            $disc: end.disclosure,
            $cats: JSON.stringify(end.categories),
            $claim: end.claim || null,
            $issued: end.issued,
            $proof: end.proof?.proofValue || null
          } as any);
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

          db.query(`
            INSERT OR REPLACE INTO notes
            (id, issuer, subject_url, subject_id, reply_to, text, issued, proof_value)
            VALUES ($id, $issuer, $sUrl, $sId, $replyTo, $text, $issued, $proof)
          `).run({
            $id: note.id,
            $issuer: note.issuer,
            $sUrl: note.subject?.url || null,
            $sId: note.subject?.id || null,
            $replyTo: note.replyTo || null,
            $text: note.text,
            $issued: note.issued,
            $proof: note.proof?.proofValue || null
          } as any);
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
