import canonicalize from 'canonicalize';
import { createHash } from 'node:crypto';
import nacl from 'tweetnacl';
import bs58 from 'bs58';

export function jcsCanonicalize(data: unknown): string {
  const result = canonicalize(data);
  if (result === undefined) {
    throw new Error('Canonicalization failed: input cannot be undefined');
  }
  return result;
}

export function getDigest(data: Record<string, unknown>): Uint8Array {
  const payload = { ...data };
  delete payload.proof;

  const canonicalString = jcsCanonicalize(payload);
  const hash = createHash('sha256');
  hash.update(canonicalString, 'utf8');
  return new Uint8Array(hash.digest());
}

export function verifyObject(data: Record<string, unknown>, publicKeyMultibase: string): boolean {
  try {
    const proof = data.proof as Record<string, unknown> | undefined;
    if (!proof) return false;
    if (proof.type !== 'Ed25519Signature2020') return false;

    const signatureMb = proof.proofValue as string | undefined;
    if (!signatureMb || !signatureMb.startsWith('z')) return false;

    const signatureBytes = bs58.decode(signatureMb.slice(1));

    if (!publicKeyMultibase.startsWith('z')) return false;
    const publicKeyBytes = bs58.decode(publicKeyMultibase.slice(1));

    const digest = getDigest(data);

    return nacl.sign.detached.verify(digest, signatureBytes, publicKeyBytes);
  } catch (error) {
    return false;
  }
}

/**
 * Signs a PeerWeight object.
 * 
 * @param data The JSON object to sign (without proof).
 * @param privateKeyBytes The signer's private key.
 */
export function signObject(data: Record<string, unknown>, privateKeyBytes: Uint8Array): Record<string, unknown> {
  const digest = getDigest(data);
  const signature = nacl.sign.detached(digest, privateKeyBytes);
  const signatureMb = 'z' + bs58.encode(signature);

  return {
    ...data,
    proof: {
      type: 'Ed25519Signature2020',
      proofValue: signatureMb
    }
  };
}
