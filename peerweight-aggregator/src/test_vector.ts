import { verifyObject, getDigest } from './core/crypto';
import { EndorsementSchema } from './core/models';

function toHex(buffer: Uint8Array): string {
  return Array.from(buffer)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

async function runTestVector() {
  console.log("Running Normative Test Vector Verification (Bun)...");

  // 1. The Canonical JSON Input (from Appendix B.1)
  const jsonStr = '{"categories":["commerce/kitchen/knives"],"disclosure":"purchased","id":"urn:uuid:550e8400-e29b-41d4-a716-446655440000","issued":"2026-01-15T12:00:00Z","issuer":"did:peerweight:example.com","subject":{"resourceType":"product","url":"https://amazon.com/dp/B00005MEGG"},"type":"PeerWeightEndorsement","weight":5}';
  const dataWithoutProof = JSON.parse(jsonStr);

  // 2. Verify SHA-256 Digest (Appendix B.2)
  const expectedDigestHex = "ed92548f21844d77f9bcf75aa2448f8aa6d9e573c2259de2baa7833ff62ab1fd";
  const actualDigest = getDigest(dataWithoutProof);
  const actualDigestHex = toHex(actualDigest);

  console.log(`Expected Digest: ${expectedDigestHex}`);
  console.log(`Actual Digest:   ${actualDigestHex}`);

  if (expectedDigestHex === actualDigestHex) {
    console.log("[PASS] Digest matches.");
  } else {
    console.error("[FAIL] Digest mismatch!");
    process.exit(1);
  }

  // 3. Construct Full Object with Proof (Appendix B.4)
  const publicKey = "z5WcE8o73vmsSZXeeWTLm3ty3fAJKCnBWRF6VuKUme5nu";
  const signature = "z3aefja3LgJ9548tAfLxgvAH6TWWHbx1BkBM2AFqT4Gx93NYF5cc552G4GXu63s1kdDmc5ifiAAmiF2qsaXhwT9ip";

  const fullObject = {
    ...dataWithoutProof,
    proof: {
      type: "Ed25519Signature2020",
      proofValue: signature
    }
  };

  // 4. Verify Signature using core.crypto
  const isValid = verifyObject(fullObject, publicKey);

  if (isValid) {
    console.log("[PASS] Signature verified successfully.");
  } else {
    console.error("[FAIL] Signature verification failed!");
    process.exit(1);
  }

  // 5. Verify Zod Model Compliance
  const parseResult = EndorsementSchema.safeParse(fullObject);
  if (parseResult.success) {
    console.log("[PASS] Zod model validation passed.");
  } else {
    console.error("[FAIL] Zod model validation failed:", parseResult.error);
    process.exit(1);
  }
}

runTestVector().catch(err => {
  console.error("Test failed with error:", err);
  process.exit(1);
});
