import { db, initDB } from './core/db';
import { signObject } from './core/crypto';
import nacl from 'tweetnacl';
import bs58 from 'bs58';

// Ensure DB is ready
initDB();

console.log('Seeding Database with Dummy Data...');

// 1. Generate a Keypair for "Alice Blog"
const keyPair = nacl.sign.keyPair();
const publicKeyMb = 'z' + bs58.encode(keyPair.publicKey);
const did = 'did:peerweight:aliceblog.com';

console.log(`Created Identity: ${did}`);
console.log(`Public Key: ${publicKeyMb}`);

// 2. Insert Identity
db.query(`
  INSERT OR REPLACE INTO identities (did, domain, public_key_multibase, created, last_crawled)
  VALUES ($did, $domain, $pk, $created, $now)
`).run({
  $did: did,
  $domain: 'aliceblog.com',
  $pk: publicKeyMb,
  $created: new Date().toISOString(),
  $now: new Date().toISOString()
});

// 3. Create & Sign an Endorsement (Alice endorses her own post)
const endorsementUnsigned = {
  type: 'PeerWeightEndorsement',
  id: 'urn:uuid:e1-dummy-' + Date.now(),
  issuer: did,
  subject: {
    url: 'https://aliceblog.com/posts/my-new-idea',
    resourceType: 'post'
  },
  weight: 5,
  disclosure: 'self',
  categories: ['tech/decentralization', 'web/standards'],
  claim: 'I propose a new way to handle blog comments using PeerWeight.',
  issued: new Date().toISOString()
};

const endorsement = signObject(endorsementUnsigned, keyPair.secretKey);
const endProof = (endorsement.proof as any).proofValue;

console.log(`Signed Endorsement: ${endorsementUnsigned.id}`);

db.query(`
  INSERT OR REPLACE INTO endorsements 
  (id, issuer, subject_url, subject_id, weight, disclosure, categories, claim, issued, proof_value)
  VALUES ($id, $issuer, $sUrl, $sId, $weight, $disc, $cats, $claim, $issued, $proof)
`).run({
  $id: endorsementUnsigned.id,
  $issuer: did,
  $sUrl: endorsementUnsigned.subject.url,
  $sId: null,
  $weight: 5,
  $disc: 'self',
  $cats: JSON.stringify(endorsementUnsigned.categories),
  $claim: endorsementUnsigned.claim,
  $issued: endorsementUnsigned.issued,
  $proof: endProof
});

// 4. Create "Bob" and a Comment (Note)
const bobKeyPair = nacl.sign.keyPair();
const bobDid = 'did:peerweight:bob.com';
const bobPk = 'z' + bs58.encode(bobKeyPair.publicKey);

db.query(`
  INSERT OR REPLACE INTO identities (did, domain, public_key_multibase, created, last_crawled)
  VALUES ($did, $domain, $pk, $created, $now)
`).run({
  $did: bobDid,
  $domain: 'bob.com',
  $pk: bobPk,
  $created: new Date().toISOString(),
  $now: new Date().toISOString()
});

const noteUnsigned = {
  type: 'PeerWeightNote',
  id: 'urn:uuid:n1-dummy-' + Date.now(),
  issuer: bobDid,
  subject: {
    url: 'https://aliceblog.com/posts/my-new-idea'
  },
  text: 'Great post! But have you considered Sybil attacks?',
  issued: new Date().toISOString()
};

const note = signObject(noteUnsigned, bobKeyPair.secretKey);
const noteProof = (note.proof as any).proofValue;

console.log(`Signed Note: ${noteUnsigned.id}`);

db.query(`
  INSERT OR REPLACE INTO notes
  (id, issuer, subject_url, subject_id, reply_to, text, issued, proof_value)
  VALUES ($id, $issuer, $sUrl, $sId, $replyTo, $text, $issued, $proof)
`).run({
  $id: noteUnsigned.id,
  $issuer: bobDid,
  $sUrl: noteUnsigned.subject.url,
  $sId: null,
  $replyTo: null,
  $text: noteUnsigned.text,
  $issued: noteUnsigned.issued,
  $proof: noteProof
});

console.log('Seed Complete.');
