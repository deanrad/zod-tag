# zod-tag

A template literal tag for converting YAML strings to Zod schemas.

## Installation

```bash
npm install zod-tag
```

## Usage

```typescript
import { z } from 'zod';
import { yaml } from 'zod-tag';

// Define a schema using YAML
const userSchema = yaml`
type: object
properties:
  name:
    type: string
    minLength: 2
  age:
    type: number
    minimum: 18
  email:
    type: string
    format: email
required:
  - name
  - email
`;

// Use the schema for validation
const validUser = {
  name: 'John',
  age: 25,
  email: 'john@example.com'
};

const invalidUser = {
  name: 'J',
  age: 15
};

console.log(userSchema.safeParse(validUser)); // { success: true, data: {...} }
console.log(userSchema.safeParse(invalidUser)); // { success: false, error: ZodError }
```

## Features

- Write Zod schemas using YAML syntax
- Full type safety with TypeScript
- Support for all basic Zod schema types
- Nested schemas support

## Limitations

- Some advanced Zod features might require custom syntax extensions
- See documentation for full details on supported features

## License

MIT