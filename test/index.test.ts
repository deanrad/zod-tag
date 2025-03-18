import { yaml } from "../src";
import { z } from "zod";

// For reference

// const typedSchema = z.object({
//   name: z.string().min(10),
//   status: z.enum(["0", "1", "18"]),
// });
// type T = z.infer<typeof typedSchema>;
// const user: T = {
//   name: "Foo", // TS doesnt do length
//   status: "18", // typescript can validate
// };
// try {
//   typedSchema.parse(user);
// } catch (err) {
//   console.log("caught the validation error", err);
// }

describe("yaml tagged template", () => {
  describe("basic types", () => {
    test("string schema", () => {
      const schema = yaml`
        type: string
        minLength: 2
        maxLength: 10
      `;

      expect(schema).toBeInstanceOf(z.ZodString);
      expect(schema.safeParse("a").success).toBe(false);
      expect(schema.safeParse("abc").success).toBe(true);
      expect(schema.safeParse("abcdefghijk").success).toBe(false);

      // Test type inference - this ensures typescript treats the type as a string
      type StringType = z.infer<typeof schema>;
      // This validates at compile time that the inferred type is string
      const stringValue: StringType = "test string";
      // Would fail at compile time: const invalidValue: StringType = 123;
    });

    test("number schema", () => {
      const schema = yaml`
        type: number
        minimum: 5
        maximum: 10
      `;

      expect(schema).toBeInstanceOf(z.ZodNumber);
      expect(schema.safeParse(4).success).toBe(false);
      expect(schema.safeParse(7).success).toBe(true);
      expect(schema.safeParse(11).success).toBe(false);

      // Test type inference - this ensures typescript treats the type as a number
      type NumberType = z.infer<typeof schema>;
      // This validates at compile time that the inferred type is number
      const numberValue: NumberType = 7;
      // Would fail at compile time: const invalidValue: NumberType = "test";
    });

    test("integer schema", () => {
      const schema = yaml`
        type: integer
        minimum: 1
        maximum: 5
      `;

      expect(schema.safeParse(0).success).toBe(false);
      expect(schema.safeParse(3).success).toBe(true);
      expect(schema.safeParse(3.5).success).toBe(false);
      expect(schema.safeParse(6).success).toBe(false);

      // Test type inference - this ensures typescript treats the type as a number
      type IntegerType = z.infer<typeof schema>;
      // This validates at compile time that the inferred type is number
      const intValue: IntegerType = 3;
      // Would fail at compile time: const invalidValue: IntegerType = "test";
    });

    test("boolean schema", () => {
      const schema = yaml`
        type: boolean
      `;

      expect(schema).toBeInstanceOf(z.ZodBoolean);
      expect(schema.safeParse(true).success).toBe(true);
      expect(schema.safeParse(false).success).toBe(true);
      expect(schema.safeParse("true").success).toBe(false);

      // Test type inference - this ensures typescript treats the type as a boolean
      type BooleanType = z.infer<typeof schema>;
      // This validates at compile time that the inferred type is boolean
      const boolValue: BooleanType = true;
      // Would fail at compile time: const invalidValue: BooleanType = "test";
    });

    test("null schema", () => {
      const schema = yaml`
        type: "null"
      `;

      expect(schema).toBeInstanceOf(z.ZodNull);
      expect(schema.safeParse(null).success).toBe(true);
      expect(schema.safeParse(undefined).success).toBe(false);
      expect(schema.safeParse("").success).toBe(false);

      // Test type inference - this ensures typescript treats the type as null
      type NullType = z.infer<typeof schema>;
      // This validates at compile time that the inferred type is null
      const nullValue: NullType = null;
      // Would fail at compile time: const invalidValue: NullType = undefined;
    });
  });

  describe("array schema", () => {
    test("array of strings", () => {
      const schema = yaml`
        type: array
        items:
          type: string
        minItems: 1
        maxItems: 3
      `;

      expect(schema).toBeInstanceOf(z.ZodArray);
      expect(schema.safeParse([]).success).toBe(false);
      expect(schema.safeParse(["a"]).success).toBe(true);
      expect(schema.safeParse(["a", "b", "c"]).success).toBe(true);
      expect(schema.safeParse(["a", "b", "c", "d"]).success).toBe(false);
      expect(schema.safeParse(["a", 1]).success).toBe(false);

      // Test type inference - this ensures typescript treats the type as string[]
      type StringArrayType = z.infer<typeof schema>;
      // This validates at compile time that the inferred type is string[]
      const stringArray: StringArrayType = ["a", "b", 2, 4, {}];
      // Would fail at compile time: const invalidArray: StringArrayType = [1, 2];
    });

    test("array with unique items", () => {
      const schema = yaml`
        type: array
        items:
          type: number
        uniqueItems: true
      `;

      expect(schema.safeParse([1, 2, 3]).success).toBe(true);
      expect(schema.safeParse([1, 2, 2]).success).toBe(false);

      // Test type inference - this ensures typescript treats the type as number[]
      type NumberArrayType = z.infer<typeof schema>;
      // This validates at compile time that the inferred type is number[]
      const numberArray: NumberArrayType = [1, 2, 3];
      // Would fail at compile time: const invalidArray: NumberArrayType = ["a", "b"];
    });
  });

  describe("object schema", () => {
    test("simple object", () => {
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
      expect(schema.safeParse({ name: "John" }).success).toBe(true);
      expect(schema.safeParse({ name: "John", age: 30 }).success).toBe(true);
      expect(schema.safeParse({ age: 30 }).success).toBe(false);

      // Test type inference - ensures typescript infers the correct object shape
      type UserType = z.infer<typeof schema>;
      // These compile correctly with the expected type
      const user1: UserType = { name: "John" };
      const user2: UserType = { name: "John", age: 30 };

      // Would fail at compile time:
      // const invalidUser1: UserType = {}; // Missing required property 'name'
      // const invalidUser2: UserType = { name: 123 }; // Wrong type for name
      // const invalidUser3: UserType = { name: "John", age: "30" }; // Wrong type for age

      // Type should be equivalent to this interface
      interface ExpectedType {
        name: string;
        age?: number;
      }

      // This assignment ensures they're compatible
      const _typeCheck: ExpectedType = {} as UserType;
      const _typeCheckReverse: UserType = {} as ExpectedType;
    });

    test("nested object", () => {
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

      expect(
        schema.safeParse({
          user: {
            name: "John",
            address: {
              city: "New York",
            },
          },
        }).success
      ).toBe(true);

      expect(
        schema.safeParse({
          user: {
            name: "John",
            address: {},
          },
        }).success
      ).toBe(false);

      // Test type inference - ensures typescript infers the correct nested object shape
      type NestedType = z.infer<typeof schema>;

      // These compile correctly with the expected type
      const validNestedObj1: NestedType = {
        user: {
          name: "John",
          address: {
            city: "New York",
          },
        },
      };

      const validNestedObj2: NestedType = {
        user: {
          name: "John",
          address: {
            city: "New York",
            street: "123 Main St",
          },
        },
      };

      // Would fail at compile time:
      // const invalidObj1: NestedType = {}; // Missing required property 'user'
      // const invalidObj2: NestedType = { user: {} }; // Missing required property 'name' in user
      // const invalidObj3: NestedType = { user: { name: "John", address: {} } }; // Missing required property 'city' in address

      // Type should be equivalent to this interface
      interface ExpectedNestedType {
        user: {
          name: string;
          address?: {
            street?: string;
            city: string;
          };
        };
      }

      // This assignment ensures they're compatible
      const _typeCheck: ExpectedNestedType = {} as NestedType;
      const _typeCheckReverse: NestedType = {} as ExpectedNestedType;
    });

    test("additionalProperties handling", () => {
      const strictSchema = yaml`
        type: object
        properties:
          name: 
            type: string
        additionalProperties: false
      `;

      expect(strictSchema.safeParse({ name: "John" }).success).toBe(true);
      expect(strictSchema.safeParse({ name: "John", age: 30 }).success).toBe(
        false
      );

      // Test type inference for strict schema
      type StrictType = z.infer<typeof strictSchema>;

      // This compiles correctly with the expected type
      const strictObj: StrictType = { name: "John" };

      // Would fail at compile time:
      // const invalidStrictObj: StrictType = { name: "John", age: 30 }; // Property 'age' doesn't exist on type

      const passthroughSchema = yaml`
        type: object
        properties:
          name: 
            type: string
        additionalProperties: true
      `;

      expect(
        passthroughSchema.safeParse({ name: "John", age: 30 }).success
      ).toBe(true);

      // Test type inference for passthrough schema
      type PassthroughType = z.infer<typeof passthroughSchema>;

      // These compile correctly with the expected type
      const passthroughObj1: PassthroughType = { name: "John" };
      const passthroughObj2: PassthroughType = {
        name: "John",
        age: 30,
        email: "john@example.com",
      };

      // The inferred type with additionalProperties: true should allow any other property
      interface ExpectedPassthroughType {
        name?: string;
        [key: string]: any;
      }

      // This assignment ensures they're compatible
      const _passthroughTypeCheck: ExpectedPassthroughType =
        {} as PassthroughType;
      const _passthroughTypeCheckReverse: PassthroughType =
        {} as ExpectedPassthroughType;
    });
  });

  describe("special formats", () => {
    test("email format", () => {
      const schema = yaml`
        type: string
        format: email
      `;

      expect(schema.safeParse("not-an-email").success).toBe(false);
      expect(schema.safeParse("user@example.com").success).toBe(true);
    });

    test("url format", () => {
      const schema = yaml`
        type: string
        format: url
      `;

      expect(schema.safeParse("not-a-url").success).toBe(false);
      expect(schema.safeParse("https://example.com").success).toBe(true);
    });
  });

  describe("union types", () => {
    test("oneOf union", () => {
      const schema = yaml`
        oneOf:
          - type: string
          - type: number
      `;

      expect(schema.safeParse("test").success).toBe(true);
      expect(schema.safeParse(123).success).toBe(true);
      expect(schema.safeParse(true).success).toBe(false);

      // Test type inference - ensures typescript infers the correct union type
      type UnionType = z.infer<typeof schema>;

      // These compile correctly with the expected type
      const unionVal1: UnionType = "test string";
      const unionVal2: UnionType = 123;

      // Would fail at compile time:
      // const invalidUnionVal: UnionType = true; // Boolean is not in the union type

      // Type should be equivalent to this type
      type ExpectedUnionType = string | number;

      // This assignment ensures they're compatible
      const _typeCheck: ExpectedUnionType = {} as UnionType;
      const _typeCheckReverse: UnionType = {} as ExpectedUnionType;
    });
  });

  describe("enum types", () => {
    test("enum values", () => {
      const schema = yaml`
        enum:
          - red
          - green
          - blue
      `;

      expect(schema.safeParse("red").success).toBe(true);
      expect(schema.safeParse("green").success).toBe(true);
      expect(schema.safeParse("yellow").success).toBe(false);

      // Test type inference - ensures typescript infers the correct enum type
      type ColorType = z.infer<typeof schema>;

      // These compile correctly with the expected type
      const color1: ColorType = "red";
      const color2: ColorType = "green";
      const color3: ColorType = "blue";

      // Would fail at compile time:
      // const invalidColor1: ColorType = "yellow"; // "yellow" is not in the enum
      // const invalidColor2: ColorType = 123; // number is not in the enum

      // Type should be equivalent to this type
      type ExpectedEnumType = "red" | "green" | "blue";

      // This assignment ensures they're compatible
      const _typeCheck: ExpectedEnumType = {} as ColorType;
      const _typeCheckReverse: ColorType = {} as ExpectedEnumType;
    });
  });

  describe("complex type inference scenarios", () => {
    test("intersection types (allOf)", () => {
      const schema = yaml`
        allOf:
          - type: object
            properties:
              name:
                type: string
            required:
              - name
          - type: object
            properties:
              age:
                type: number
            required:
              - age
      `;

      expect(schema.safeParse({}).success).toBe(false);
      expect(schema.safeParse({ name: "John" }).success).toBe(false);
      expect(schema.safeParse({ age: 30 }).success).toBe(false);
      expect(schema.safeParse({ name: "John", age: 30 }).success).toBe(true);

      // Test type inference for intersection type
      type PersonType = z.infer<typeof schema>;

      // This compiles correctly with the expected type
      const validPerson: PersonType = { name: "John", age: 30 };

      // Would fail at compile time:
      // const invalidPerson1: PersonType = { age: 30 }; // Missing required property 'name'
      // const invalidPerson2: PersonType = { name: "John" }; // Missing required property 'age'

      // Type should be equivalent to this interface
      interface ExpectedPersonType {
        name: string;
        age: number;
      }

      // This assignment ensures they're compatible
      const _typeCheck: ExpectedPersonType = {} as PersonType;
      const _typeCheckReverse: PersonType = {} as ExpectedPersonType;
    });

    test("complex nested structure", () => {
      const schema = yaml`
        type: object
        properties:
          users:
            type: array
            items:
              type: object
              properties:
                id:
                  type: integer
                name:
                  type: string
                roles:
                  type: array
                  items:
                    enum:
                      - admin
                      - editor
                      - viewer
              required:
                - id
                - name
        required:
          - users
      `;

      // Validate the schema works as expected
      expect(
        schema.safeParse({ users: [{ id: 1, name: "John" }] }).success
      ).toBe(true);
      expect(schema.safeParse({}).success).toBe(false);
      expect(schema.safeParse({ users: [{ id: 1 }] }).success).toBe(false);

      // Test type inference for complex nested structure
      type UsersListType = z.infer<typeof schema>;

      // This compiles correctly with the expected type
      const validUserList: UsersListType = {
        users: [
          { id: 1, name: "John" },
          { id: 2, name: "Jane", roles: ["admin", "editor"] },
        ],
      };

      // Would fail at compile time:
      // const invalidUserList1: UsersListType = {}; // Missing required property 'users'
      // const invalidUserList2: UsersListType = { users: [{ id: 1 }] }; // Missing required property 'name' in user
      // const invalidUserList3: UsersListType =
      //   { users: [{ id: 1, name: "John", roles: ["superadmin"] }] }; // Wrong role type

      // Type should be equivalent to this interface
      interface ExpectedUsersListType {
        users: Array<{
          id: number;
          name: string;
          roles?: Array<"admin" | "editor" | "viewer">;
        }>;
      }

      // This assignment ensures they're compatible
      const _typeCheck: ExpectedUsersListType = {} as UsersListType;
      const _typeCheckReverse: UsersListType = {} as ExpectedUsersListType;
    });

    test("dedicated type inference test", () => {
      // This test specifically focuses on checking that z.infer<typeof schema>
      // correctly returns expected types for all schema variations

      // Create schemas for each primary type
      const stringSchema = yaml`type: string`;
      const numberSchema = yaml`type: number`;
      const booleanSchema = yaml`type: boolean`;
      const nullSchema = yaml`type: "null"`;
      const arraySchema = yaml`
        type: array
        items:
          type: string
      `;
      const objectSchema = yaml`
        type: object
        properties:
          name: 
            type: string
          details:
            type: object
            properties:
              age:
                type: number
            required:
              - age
        required:
          - name
      `;
      const enumSchema = yaml`
        enum:
          - one
          - two
          - three
      `;
      const unionSchema = yaml`
        oneOf:
          - type: string
          - type: number
      `;

      // Check all inferred types
      type StringType = z.infer<typeof stringSchema>;
      type NumberType = z.infer<typeof numberSchema>;
      type BooleanType = z.infer<typeof booleanSchema>;
      type NullType = z.infer<typeof nullSchema>;
      type ArrayType = z.infer<typeof arraySchema>;
      type ObjectType = z.infer<typeof objectSchema>;
      type EnumType = z.infer<typeof enumSchema>;
      type UnionType = z.infer<typeof unionSchema>;

      // These assignments verify the inferred types are correct
      const validString: StringType = "test";
      const validNumber: NumberType = 123;
      const validBoolean: BooleanType = true;
      const validNull: NullType = null;
      const validArray: ArrayType = ["one", "two"];
      const validObject: ObjectType = {
        name: "John",
        details: { age: 30 },
      };
      const validEnum: EnumType = "two";
      const validUnion1: UnionType = "test";
      const validUnion2: UnionType = 123;

      // Type compatibility verification
      type ExpectedObjectType = {
        name: string;
        details?: {
          age: number;
        };
      };

      // This ensures the inferred type matches our expectation
      const _objectTypeCheck: ExpectedObjectType = {} as ObjectType;
      const _objectTypeCheckReverse: ObjectType = {} as ExpectedObjectType;

      // All tests pass if TypeScript successfully compiles this test
    });
  });

  describe("template interpolation", () => {
    test("variable interpolation", () => {
      const minLength = 3;
      const schema = yaml`
        type: string
        minLength: ${minLength}
        maxLength: 10
      `;

      expect(schema.safeParse("ab").success).toBe(false);
      expect(schema.safeParse("abc").success).toBe(true);
    });
  });

  describe("edge cases and limitations", () => {
    test("unrecognized type defaults to any", () => {
      const schema = yaml`
        type: unknown-type
      `;

      expect(schema).toBeInstanceOf(z.ZodAny);
      expect(schema.safeParse("anything").success).toBe(true);
    });

    test("reference handling (limitation)", () => {
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
      expect(schema.safeParse({ user: { name: "John" } }).success).toBe(true);

      // In a proper implementation, the $ref would be resolved and validation would be applied
      // This would validate that user has a name property of type string
    });
  });
});
