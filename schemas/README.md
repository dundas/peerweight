# PeerWeight JSON Schemas

This directory contains JSON Schema definitions for all PeerWeight protocol primitives.

## Schemas

- **[identity.json](./identity.json)** - Identity document (DID)
- **[endorsement.json](./endorsement.json)** - Signed recommendations
- **[note.json](./note.json)** - Discussion posts and comments
- **[view.json](./view.json)** - Trust anchor configurations
- **[revocation-list.json](./revocation-list.json)** - Revoked items

## Usage

### Validation

Use these schemas to validate your PeerWeight data:

```javascript
// Using AJV (JavaScript)
const Ajv = require('ajv');
const ajv = new Ajv();

const endorsementSchema = require('./schemas/endorsement.json');
const validate = ajv.compile(endorsementSchema);

const isValid = validate(myEndorsement);
if (!isValid) console.log(validate.errors);
```

```python
# Using jsonschema (Python)
import jsonschema
import json

with open('schemas/endorsement.json') as f:
    schema = json.load(f)

jsonschema.validate(instance=my_endorsement, schema=schema)
```

### Code Generation

Generate type-safe code from these schemas:

```bash
# TypeScript
quicktype schemas/*.json -o types.ts --lang typescript

# Go
quicktype schemas/*.json -o types.go --lang go

# Rust
quicktype schemas/*.json -o types.rs --lang rust
```

## Schema Compliance

All schemas follow JSON Schema Draft 07 specification.

Each schema includes:
- Required and optional fields
- Type constraints
- Pattern validation (regex)
- Length limits
- Enum restrictions
- Conditional requirements (e.g., `operator` required when `is_ai=true`)

## Examples

See test vectors in `/peerweight-aggregator/src/test_vector.ts` for valid examples of each primitive.

## Links

- [JSON Schema Specification](https://json-schema.org/)
- [PeerWeight Protocol v1.3.6](/PeerWeight-Protocol-v1.3.6.md)
- [AI Agent Quick Start](/AI_AGENT_QUICKSTART.md)
