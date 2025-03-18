import { load } from 'js-yaml';
import { z } from 'zod';

/**
 * Convert a YAML schema definition to a Zod schema following JSON Schema spec
 * @param strings Template literal strings
 * @param values Template literal values to be interpolated
 * @returns Zod schema
 */
export function yaml(strings: TemplateStringsArray, ...values: any[]): z.ZodTypeAny {
  // Combine the template literal parts
  const yamlString = strings.reduce((acc, str, i) => {
    return acc + str + (values[i] || '');
  }, '');

  // Parse YAML to JS object
  const parsed = load(yamlString);

  // Convert the parsed YAML schema to a Zod schema
  return convertToZodSchema(parsed);
}

/**
 * Utility function to convert a YAML string directly to a Zod schema
 * @param yamlString The YAML schema as a string (JSON Schema format)
 * @returns A Zod schema
 */
export function fromYaml(yamlString: string): z.ZodTypeAny {
  const parsed = load(yamlString);
  return convertToZodSchema(parsed);
}

/**
 * Utility function to convert a JavaScript object to a Zod schema
 * This is useful when you already have a parsed JSON Schema object
 * @param schemaObj The JSON Schema object
 * @returns A Zod schema
 */
export function fromSchemaObject(schemaObj: any): z.ZodTypeAny {
  return convertToZodSchema(schemaObj);
}

/**
 * Convert a parsed JSON Schema object to a Zod schema
 * @param schema The parsed JSON Schema definition
 * @returns A Zod schema
 */
function convertToZodSchema(schema: any): z.ZodTypeAny {
  // If schema is not an object or is null, default to any schema
  if (typeof schema !== 'object' || schema === null) {
    return z.any();
  }

  // Handle special case for $ref (JSON Schema reference)
  if (schema.$ref) {
    // Currently, we don't support $ref resolution
    // In a full implementation, this would resolve the reference
    console.warn(`$ref not fully supported: ${schema.$ref}`);
    return z.any();
  }

  // Handle the schema based on type or special JSON Schema keywords
  
  // Handle enum first as it can be standalone in JSON Schema
  if (schema.enum) {
    return z.enum(schema.enum);
  }

  // Handle JSON Schema union types
  if (schema.oneOf) {
    return createUnionSchema(schema.oneOf);
  } 
  
  // Handle JSON Schema intersection types
  if (schema.allOf) {
    return createIntersectionSchema(schema.allOf);
  }
  
  // Handle anyOf (similar to oneOf but less strict)
  if (schema.anyOf) {
    return createUnionSchema(schema.anyOf);
  }

  // Handle type-specific schemas (standard JSON Schema type property)
  const schemaType = schema.type as string;

  switch (schemaType) {
    case 'string':
      return createStringSchema(schema);
    case 'number':
      return createNumberSchema(schema);
    case 'integer':
      return createIntegerSchema(schema);
    case 'boolean':
      return z.boolean();
    case 'null':
      return z.null();
    case 'array':
      return createArraySchema(schema);
    case 'object':
      return createObjectSchema(schema);
    case 'const':
      // JSON Schema const keyword
      return z.literal(schema.const);
    default:
      // Default to any if type is not recognized
      return z.any();
  }
}

/**
 * Create a string schema with validations according to JSON Schema spec
 */
function createStringSchema(schema: any): z.ZodString {
  let zodSchema = z.string();

  // Apply JSON Schema string validations
  if (schema.minLength !== undefined) {
    zodSchema = zodSchema.min(schema.minLength);
  }

  if (schema.maxLength !== undefined) {
    zodSchema = zodSchema.max(schema.maxLength);
  }

  if (schema.pattern !== undefined) {
    zodSchema = zodSchema.regex(new RegExp(schema.pattern));
  }

  // Handle standard JSON Schema string formats
  if (schema.format) {
    switch (schema.format) {
      case 'email':
        zodSchema = zodSchema.email();
        break;
      case 'uri':
      case 'uri-reference':
      case 'url':
        zodSchema = zodSchema.url();
        break;
      case 'uuid':
        zodSchema = zodSchema.uuid();
        break;
      case 'date-time':
        // Special handling for ISO date strings
        zodSchema = zodSchema.refine(
          (val) => !isNaN(Date.parse(val)),
          { message: 'Invalid ISO date string' }
        ) as unknown as z.ZodString;
        break;
      case 'date':
        // Validate date format YYYY-MM-DD
        zodSchema = zodSchema.regex(/^\d{4}-\d{2}-\d{2}$/);
        break;
      case 'time':
        // Validate time format HH:MM:SS
        zodSchema = zodSchema.regex(/^\d{2}:\d{2}:\d{2}$/);
        break;
      // Additional formats could be added here
    }
  }

  // Handle JSON Schema contentEncoding if needed
  if (schema.contentEncoding === 'base64') {
    // Basic base64 validation
    zodSchema = zodSchema.regex(/^[A-Za-z0-9+/=]*$/);
  }

  return zodSchema;
}

/**
 * Create a number schema with validations according to JSON Schema spec
 */
function createNumberSchema(schema: any): z.ZodNumber {
  let zodSchema = z.number();

  // Handle JSON Schema number validations
  if (schema.minimum !== undefined) {
    zodSchema = zodSchema.gte(schema.minimum);
  }

  // Handle exclusiveMinimum per JSON Schema draft 7+
  if (schema.exclusiveMinimum !== undefined) {
    if (typeof schema.exclusiveMinimum === 'boolean' && schema.exclusiveMinimum && schema.minimum !== undefined) {
      // Draft 4 style
      zodSchema = zodSchema.gt(schema.minimum);
    } else if (typeof schema.exclusiveMinimum === 'number') {
      // Draft 7+ style
      zodSchema = zodSchema.gt(schema.exclusiveMinimum);
    }
  }

  if (schema.maximum !== undefined) {
    zodSchema = zodSchema.lte(schema.maximum);
  }

  // Handle exclusiveMaximum per JSON Schema draft 7+
  if (schema.exclusiveMaximum !== undefined) {
    if (typeof schema.exclusiveMaximum === 'boolean' && schema.exclusiveMaximum && schema.maximum !== undefined) {
      // Draft 4 style
      zodSchema = zodSchema.lt(schema.maximum);
    } else if (typeof schema.exclusiveMaximum === 'number') {
      // Draft 7+ style
      zodSchema = zodSchema.lt(schema.exclusiveMaximum);
    }
  }

  if (schema.multipleOf !== undefined) {
    zodSchema = zodSchema.multipleOf(schema.multipleOf);
  }

  return zodSchema;
}

/**
 * Create an integer schema with validations according to JSON Schema spec
 */
function createIntegerSchema(schema: any): z.ZodNumber {
  // Start with number schema and add integer constraint (matches JSON Schema integer type)
  let zodSchema = z.number().int();

  // Apply same validation logic as for number type
  if (schema.minimum !== undefined) {
    zodSchema = zodSchema.gte(schema.minimum);
  }

  // Handle exclusiveMinimum per JSON Schema draft 7+
  if (schema.exclusiveMinimum !== undefined) {
    if (typeof schema.exclusiveMinimum === 'boolean' && schema.exclusiveMinimum && schema.minimum !== undefined) {
      // Draft 4 style
      zodSchema = zodSchema.gt(schema.minimum);
    } else if (typeof schema.exclusiveMinimum === 'number') {
      // Draft 7+ style
      zodSchema = zodSchema.gt(schema.exclusiveMinimum);
    }
  }

  if (schema.maximum !== undefined) {
    zodSchema = zodSchema.lte(schema.maximum);
  }

  // Handle exclusiveMaximum per JSON Schema draft 7+
  if (schema.exclusiveMaximum !== undefined) {
    if (typeof schema.exclusiveMaximum === 'boolean' && schema.exclusiveMaximum && schema.maximum !== undefined) {
      // Draft 4 style
      zodSchema = zodSchema.lt(schema.maximum);
    } else if (typeof schema.exclusiveMaximum === 'number') {
      // Draft 7+ style
      zodSchema = zodSchema.lt(schema.exclusiveMaximum);
    }
  }

  if (schema.multipleOf !== undefined) {
    zodSchema = zodSchema.multipleOf(schema.multipleOf);
  }

  return zodSchema;
}

/**
 * Create an array schema with validations according to JSON Schema spec
 */
function createArraySchema(schema: any): z.ZodArray<z.ZodTypeAny> {
  let itemSchemas: z.ZodTypeAny;
  
  // Handle different JSON Schema array validation patterns
  if (schema.items) {
    if (Array.isArray(schema.items)) {
      // JSON Schema tuple validation (array where each position has its own schema)
      const tupleSchemas = schema.items.map((item: any) => convertToZodSchema(item));
      
      // Create a tuple schema
      const tupleSchema = z.tuple(tupleSchemas);
      
      // If additionalItems is false, tuple is fixed length
      // If additionalItems is a schema, additional items must match that schema
      // Otherwise, additional items can be anything
      if (schema.additionalItems === false) {
        return tupleSchema as unknown as z.ZodArray<z.ZodTypeAny>;
      } else {
        const additionalSchema = typeof schema.additionalItems === 'object' && schema.additionalItems !== null
          ? convertToZodSchema(schema.additionalItems)
          : z.any();
          
        // Since Zod doesn't directly support this, we use array and add validation
        itemSchemas = z.any();
      }
    } else {
      // Standard JSON Schema array validation (all items match same schema)
      itemSchemas = convertToZodSchema(schema.items);
    }
  } else {
    // No item schema defined, default to any
    itemSchemas = z.any();
  }

  let zodSchema = z.array(itemSchemas);

  // Apply JSON Schema array validations
  if (schema.minItems !== undefined) {
    zodSchema = zodSchema.min(schema.minItems);
  }

  if (schema.maxItems !== undefined) {
    zodSchema = zodSchema.max(schema.maxItems);
  }

  if (schema.uniqueItems === true) {
    // JSON Schema uniqueItems validation
    zodSchema = zodSchema.refine(
      (items) => new Set(items).size === items.length,
      { message: 'Array items must be unique' }
    ) as unknown as z.ZodArray<z.ZodTypeAny>;
  }

  // Handle contains validation (at least one item must match the contains schema)
  if (schema.contains) {
    const containsSchema = convertToZodSchema(schema.contains);
    zodSchema = zodSchema.refine(
      (items) => items.some(item => containsSchema.safeParse(item).success),
      { message: 'Array must contain at least one item matching the contains schema' }
    ) as unknown as z.ZodArray<z.ZodTypeAny>;
  }

  return zodSchema;
}

/**
 * Create an object schema with validations according to JSON Schema spec
 */
function createObjectSchema(schema: any): z.ZodTypeAny {
  const shape: Record<string, z.ZodTypeAny> = {};

  // Process properties according to JSON Schema spec
  if (schema.properties) {
    Object.entries(schema.properties).forEach(([key, propSchema]) => {
      shape[key] = convertToZodSchema(propSchema);
    });
  }

  // Handle patternProperties from JSON Schema (property names matching regex)
  // This is a limitation as Zod doesn't directly support this
  if (schema.patternProperties) {
    console.warn('patternProperties is not fully supported in Zod conversion');
  }

  // Start with a basic object schema
  let zodSchema = z.object(shape);

  // Process required properties (JSON Schema required array)
  if (schema.required && Array.isArray(schema.required)) {
    const required = new Set(schema.required);
    
    // Apply .optional() to fields that are not required
    Object.keys(shape).forEach(key => {
      if (!required.has(key)) {
        // Create a new shape with optional fields
        shape[key] = shape[key].optional();
      }
    });
    
    // Recreate the object with updated shape
    zodSchema = z.object(shape);
  } else {
    // If no required fields specified, make all fields optional (default in JSON Schema)
    Object.keys(shape).forEach(key => {
      shape[key] = shape[key].optional();
    });
    
    // Recreate the object with updated shape
    zodSchema = z.object(shape);
  }

  // Additional properties handling (varies between JSON Schema and Zod)
  // In JSON Schema, additionalProperties defaults to true
  let baseSchema: z.ZodTypeAny;
  
  if (schema.additionalProperties === true || schema.additionalProperties === undefined) {
    // Allow additional properties (JSON Schema default)
    baseSchema = zodSchema.passthrough();
  } else if (schema.additionalProperties === false) {
    // Strict validation - no additional properties allowed
    baseSchema = zodSchema.strict();
  } else if (typeof schema.additionalProperties === 'object') {
    // In JSON Schema, additionalProperties can be a schema
    // Zod doesn't directly support validating additional props against a schema
    // We use passthrough as a compromise
    baseSchema = zodSchema.passthrough();
  } else {
    baseSchema = zodSchema;
  }
  
  // Handle minProperties and maxProperties from JSON Schema using type-safe refinements
  let result = baseSchema;
  
  if (schema.minProperties !== undefined) {
    const minProps = schema.minProperties;
    result = result.refine(
      (obj) => Object.keys(obj).length >= minProps,
      { message: `Object must have at least ${minProps} properties` }
    );
  }

  if (schema.maxProperties !== undefined) {
    const maxProps = schema.maxProperties;
    result = result.refine(
      (obj) => Object.keys(obj).length <= maxProps,
      { message: `Object must have at most ${maxProps} properties` }
    );
  }

  // Handle propertyNames schema from JSON Schema
  if (schema.propertyNames && schema.propertyNames.pattern) {
    const pattern = new RegExp(schema.propertyNames.pattern);
    result = result.refine(
      (obj) => Object.keys(obj).every(key => pattern.test(key)),
      { message: `All property names must match the pattern ${schema.propertyNames.pattern}` }
    );
  }

  return result;
}

/**
 * Create a union schema (oneOf/anyOf in JSON Schema)
 */
function createUnionSchema(schemas: any[]): z.ZodTypeAny {
  if (!schemas.length) {
    throw new Error('Union schema requires at least one schema');
  }

  // Convert each schema in the union
  const zodSchemas = schemas.map(schema => convertToZodSchema(schema));
  
  // Handle special cases to avoid TypeScript errors with Zod's union type
  if (zodSchemas.length === 1) {
    // For a single schema, just return it directly
    return zodSchemas[0];
  }
  
  if (zodSchemas.length === 2) {
    // For two schemas, create a simple union
    return z.union([zodSchemas[0], zodSchemas[1]]);
  }
  
  // For more schemas, we need to build the union incrementally
  // This matches JSON Schema oneOf/anyOf semantics
  let unionSchema = z.union([zodSchemas[0], zodSchemas[1]]);
  
  // Add each additional schema to the union
  for (let i = 2; i < zodSchemas.length; i++) {
    // This is a workaround for TypeScript's limitation with z.union
    unionSchema = z.union([unionSchema, zodSchemas[i]]);
  }
  
  return unionSchema;
}

/**
 * Create an intersection schema (allOf in JSON Schema)
 */
function createIntersectionSchema(schemas: any[]): z.ZodIntersection<z.ZodTypeAny, z.ZodTypeAny> {
  if (schemas.length < 2) {
    throw new Error('Intersection schema requires at least two schemas');
  }

  // Convert each schema in the allOf array
  const zodSchemas = schemas.map(schema => convertToZodSchema(schema));
  
  // Start with the first two schemas (JSON Schema allOf)
  let result = z.intersection(zodSchemas[0], zodSchemas[1]);
  
  // Add any additional schemas to the intersection
  for (let i = 2; i < zodSchemas.length; i++) {
    result = z.intersection(result, zodSchemas[i]);
  }
  
  return result;
}

// Export the main tag function
export default yaml;