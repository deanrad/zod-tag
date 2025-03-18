import { yaml } from '../src';
import { z } from 'zod';

// Define a User schema using YAML syntax
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
  role:
    enum:
      - admin
      - user
      - guest
  metadata:
    type: object
    additionalProperties: true
  tags:
    type: array
    items:
      type: string
    uniqueItems: true
required:
  - name
  - email
  - role
`;

// Example of validation with the schema
const validUser = {
  name: 'John Doe',
  age: 25,
  email: 'john@example.com',
  role: 'admin',
  metadata: {
    lastLogin: '2023-01-01',
    preferences: { theme: 'dark' }
  },
  tags: ['developer', 'frontend']
};

const invalidUser = {
  name: 'J', // Too short
  age: 16, // Below minimum
  email: 'not-an-email',
  role: 'superadmin', // Not in enum
  tags: ['developer', 'developer'] // Duplicate entries
};

// Validate the users
const validResult = userSchema.safeParse(validUser);
const invalidResult = userSchema.safeParse(invalidUser);

console.log('Valid user validation result:', validResult.success);
if (!validResult.success) {
  console.log('Valid user validation errors:', validResult.error.format());
}

console.log('Invalid user validation result:', invalidResult.success);
if (!invalidResult.success) {
  console.log('Invalid user validation errors:', invalidResult.error.format());
}

// Using the schema for type inference
type User = z.infer<typeof userSchema>;

// This would give proper TypeScript validation if imported in a TypeScript file
const newUser: User = {
  name: 'Jane Doe',
  email: 'jane@example.com',
  role: 'user',
  // TypeScript would enforce the required fields and proper types
};