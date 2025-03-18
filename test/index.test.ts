import { yaml } from '../src';
import { z } from 'zod';

describe('yaml tagged template', () => {
  describe('basic types', () => {
    test('string schema', () => {
      const schema = yaml`
        type: string
        minLength: 2
        maxLength: 10
      `;

      expect(schema).toBeInstanceOf(z.ZodString);
      expect(schema.safeParse('a').success).toBe(false);
      expect(schema.safeParse('abc').success).toBe(true);
      expect(schema.safeParse('abcdefghijk').success).toBe(false);
    });

    test('number schema', () => {
      const schema = yaml`
        type: number
        minimum: 5
        maximum: 10
      `;

      expect(schema).toBeInstanceOf(z.ZodNumber);
      expect(schema.safeParse(4).success).toBe(false);
      expect(schema.safeParse(7).success).toBe(true);
      expect(schema.safeParse(11).success).toBe(false);
    });

    test('integer schema', () => {
      const schema = yaml`
        type: integer
        minimum: 1
        maximum: 5
      `;

      expect(schema.safeParse(0).success).toBe(false);
      expect(schema.safeParse(3).success).toBe(true);
      expect(schema.safeParse(3.5).success).toBe(false);
      expect(schema.safeParse(6).success).toBe(false);
    });

    test('boolean schema', () => {
      const schema = yaml`
        type: boolean
      `;

      expect(schema).toBeInstanceOf(z.ZodBoolean);
      expect(schema.safeParse(true).success).toBe(true);
      expect(schema.safeParse(false).success).toBe(true);
      expect(schema.safeParse('true').success).toBe(false);
    });

    test('null schema', () => {
      const schema = yaml`
        type: "null"
      `;

      expect(schema).toBeInstanceOf(z.ZodNull);
      expect(schema.safeParse(null).success).toBe(true);
      expect(schema.safeParse(undefined).success).toBe(false);
      expect(schema.safeParse('').success).toBe(false);
    });
  });

  describe('array schema', () => {
    test('array of strings', () => {
      const schema = yaml`
        type: array
        items:
          type: string
        minItems: 1
        maxItems: 3
      `;

      expect(schema).toBeInstanceOf(z.ZodArray);
      expect(schema.safeParse([]).success).toBe(false);
      expect(schema.safeParse(['a']).success).toBe(true);
      expect(schema.safeParse(['a', 'b', 'c']).success).toBe(true);
      expect(schema.safeParse(['a', 'b', 'c', 'd']).success).toBe(false);
      expect(schema.safeParse(['a', 1]).success).toBe(false);
    });

    test('array with unique items', () => {
      const schema = yaml`
        type: array
        items:
          type: number
        uniqueItems: true
      `;

      expect(schema.safeParse([1, 2, 3]).success).toBe(true);
      expect(schema.safeParse([1, 2, 2]).success).toBe(false);
    });
  });

  describe('object schema', () => {
    test('simple object', () => {
      const schema = yaml`
        type: object
        properties:
          name:
            type: string
          age:
            type: number
        required:
          - name
      `;

      expect(schema).toBeInstanceOf(z.ZodObject);
      
      expect(schema.safeParse({}).success).toBe(false);
      expect(schema.safeParse({ name: 'John' }).success).toBe(true);
      expect(schema.safeParse({ name: 'John', age: 30 }).success).toBe(true);
      expect(schema.safeParse({ age: 30 }).success).toBe(false);
    });

    test('nested object', () => {
      const schema = yaml`
        type: object
        properties:
          user:
            type: object
            properties:
              name:
                type: string
              address:
                type: object
                properties:
                  street:
                    type: string
                  city:
                    type: string
                required:
                  - city
            required:
              - name
        required:
          - user
      `;

      expect(schema.safeParse({}).success).toBe(false);
      
      expect(schema.safeParse({
        user: {
          name: 'John',
          address: {
            city: 'New York'
          }
        }
      }).success).toBe(true);
      
      expect(schema.safeParse({
        user: {
          name: 'John',
          address: {}
        }
      }).success).toBe(false);
    });

    test('additionalProperties handling', () => {
      const strictSchema = yaml`
        type: object
        properties:
          name: 
            type: string
        additionalProperties: false
      `;

      expect(strictSchema.safeParse({ name: 'John' }).success).toBe(true);
      expect(strictSchema.safeParse({ name: 'John', age: 30 }).success).toBe(false);

      const passthroughSchema = yaml`
        type: object
        properties:
          name: 
            type: string
        additionalProperties: true
      `;

      expect(passthroughSchema.safeParse({ name: 'John', age: 30 }).success).toBe(true);
    });
  });

  describe('special formats', () => {
    test('email format', () => {
      const schema = yaml`
        type: string
        format: email
      `;

      expect(schema.safeParse('not-an-email').success).toBe(false);
      expect(schema.safeParse('user@example.com').success).toBe(true);
    });

    test('url format', () => {
      const schema = yaml`
        type: string
        format: url
      `;

      expect(schema.safeParse('not-a-url').success).toBe(false);
      expect(schema.safeParse('https://example.com').success).toBe(true);
    });
  });

  describe('union types', () => {
    test('oneOf union', () => {
      const schema = yaml`
        oneOf:
          - type: string
          - type: number
      `;

      expect(schema.safeParse('test').success).toBe(true);
      expect(schema.safeParse(123).success).toBe(true);
      expect(schema.safeParse(true).success).toBe(false);
    });
  });

  describe('enum types', () => {
    test('enum values', () => {
      const schema = yaml`
        enum:
          - red
          - green
          - blue
      `;

      expect(schema.safeParse('red').success).toBe(true);
      expect(schema.safeParse('green').success).toBe(true);
      expect(schema.safeParse('yellow').success).toBe(false);
    });
  });

  describe('template interpolation', () => {
    test('variable interpolation', () => {
      const minLength = 3;
      const schema = yaml`
        type: string
        minLength: ${minLength}
        maxLength: 10
      `;

      expect(schema.safeParse('ab').success).toBe(false);
      expect(schema.safeParse('abc').success).toBe(true);
    });
  });

  describe('edge cases and limitations', () => {
    test('unrecognized type defaults to any', () => {
      const schema = yaml`
        type: unknown-type
      `;

      expect(schema).toBeInstanceOf(z.ZodAny);
      expect(schema.safeParse('anything').success).toBe(true);
    });

    test('reference handling (limitation)', () => {
      // YAML/JSON Schema supports $ref for references, which would be challenging to implement
      const schema = yaml`
        type: object
        properties:
          user:
            $ref: '#/definitions/User'
        definitions:
          User:
            type: object
            properties:
              name:
                type: string
      `;

      // Currently $ref fields are converted to z.any()
      // This test acknowledges this limitation
      expect(schema.safeParse({ user: { name: 'John' } }).success).toBe(true);
      
      // In a proper implementation, the $ref would be resolved and validation would be applied
      // This would validate that user has a name property of type string
    });
  });
});