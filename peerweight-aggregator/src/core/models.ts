import { z } from 'zod';

// --- Primitives ---

export const ProofSchema = z.object({
  type: z.literal('Ed25519Signature2020'),
  proofValue: z.string(),
});

export const SubjectObjectSchema = z.object({
  url: z.string().url().optional(),
  id: z.string().regex(/^did:/).optional(),
  resourceType: z.string().describe('domain, profile, page, post, product, service, component'),
}).refine((data: { url?: string; id?: string }) => {
  return (!!data.url && !data.id) || (!data.url && !!data.id);
}, { message: "Exactly one of 'url' or 'id' must be present" });

const BaseMessageSchema = z.object({
  type: z.string(),
  id: z.string().regex(/^urn:uuid:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/),
  issuer: z.string().regex(/^did:peerweight:.+/),
  issued: z.string().datetime(),
  proof: ProofSchema.optional(),
});

// --- Endorsement ---

export const EndorsementSchema = BaseMessageSchema.extend({
  type: z.literal('PeerWeightEndorsement'),
  subject: SubjectObjectSchema,
  weight: z.number().int().min(1).max(5),
  disclosure: z.enum(['purchased', 'editorial', 'gifted', 'affiliate', 'paid', 'partner', 'self']),
  categories: z.array(z.string().regex(/^[a-z0-9]+(\/[a-z0-9-]+)*$/)),
  claim: z.string().max(280).optional(),
});

// --- Note ---

export const NoteSchema = BaseMessageSchema.extend({
  type: z.literal('PeerWeightNote'),
  subject: SubjectObjectSchema.optional(),
  replyTo: z.string().optional(),
  text: z.string().max(10000),
});

// --- View ---

export const TrustAnchorSchema = z.object({
  did: z.string(),
  weight: z.number().int().min(1).max(5),
});

export const ViewSchema = BaseMessageSchema.extend({
  type: z.literal('PeerWeightView'),
  name: z.string(),
  maintainer: z.string().optional(),
  anchors: z.array(TrustAnchorSchema),
  visibility: z.enum(['public', 'private']).default('public'),
});

// --- Revocation ---

export const RevokedItemSchema = z.object({
  id: z.string(),
  type: z.string(),
  reason: z.string().optional(),
});

export const RevocationListSchema = BaseMessageSchema.extend({
  type: z.literal('RevocationList'),
  updated: z.string().datetime(),
  revoked: z.array(RevokedItemSchema),
});
