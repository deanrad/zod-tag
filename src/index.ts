import { load } from 'js-yaml';
import { z } from 'zod';

/**
 * Convert a YAML schema definition to a Zod schema
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
 * @param yamlString The YAML schema as a string
 * @returns A Zod schema
 */
export function fromYaml(yamlString: string): z.ZodTypeAny {
  const parsed = load(yamlString);
  return convertToZodSchema(parsed);
}

/**
 * Utility function to convert a JavaScript object to a Zod schema
 * This is useful when you already have a parsed JSON Schema object
 * @param schemaObj The schema object
 * @returns A Zod schema
 */
export function fromSchemaObject(schemaObj: any): z.ZodTypeAny {
  return convertToZodSchema(schemaObj);
}

/**
 * Convert a parsed YAML schema to a Zod schema
 * @param schema The parsed YAML schema definition
 * @returns A Zod schema
 */
function convertToZodSchema(schema: any): z.ZodTypeAny {
  // If schema is not an object or is null, default to any schema
  if (typeof schema !== 'object' || schema === null) {
    return z.any();
  }

  // Handle special case for $ref
  if (schema.$ref) {
    // Currently, we don't support $ref resolution
    // In a full implementation, this would resolve the reference
    console.warn(`$ref not fully supported: ${schema.$ref}`);
    return z.any();
  }

  // Handle the schema based on its type
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
    default:
      // For custom types or union types, handle them here
      if (schema.oneOf) {
        return createUnionSchema(schema.oneOf);
      } else if (schema.allOf) {
        return createIntersectionSchema(schema.allOf);
      } else if (schema.enum) {
        return z.enum(schema.enum);
      }
      // Default to any if type is not recognized
      return z.any();
  }
}

/**
 * Create a string schema with validations
 */
function createStringSchema(schema: any): z.ZodString {
  let zodSchema = z.string();

  if (schema.minLength !== undefined) {
    zodSchema = zodSchema.min(schema.minLength);
  }

  if (schema.maxLength !== undefined) {
    zodSchema = zodSchema.max(schema.maxLength);
  }

  if (schema.pattern !== undefined) {
    zodSchema = zodSchema.regex(new RegExp(schema.pattern));
  }

  if (schema.format === 'email') {
    zodSchema = zodSchema.email();
  } else if (schema.format === 'uri' || schema.format === 'url') {
    zodSchema = zodSchema.url();
  } else if (schema.format === 'uuid') {
    zodSchema = zodSchema.uuid();
  }

  return zodSchema;
}

/**
 * Create a number schema with validations
 */
function createNumberSchema(schema: any): z.ZodNumber {
  let zodSchema = z.number();

  if (schema.minimum !== undefined) {
    zodSchema = schema.exclusiveMinimum 
      ? zodSchema.gt(schema.minimum) 
      : zodSchema.gte(schema.minimum);
  }

  if (schema.maximum !== undefined) {
    zodSchema = schema.exclusiveMaximum 
      ? zodSchema.lt(schema.maximum) 
      : zodSchema.lte(schema.maximum);
  }

  if (schema.multipleOf !== undefined) {
    zodSchema = zodSchema.multipleOf(schema.multipleOf);
  }

  return zodSchema;
}

/**
 * Create an integer schema with validations
 */
function createIntegerSchema(schema: any): z.ZodNumber {
  // Start with number schema and add integer constraint
  let zodSchema = z.number().int();

  // Add the same validations as for number type
  if (schema.minimum !== undefined) {
    zodSchema = schema.exclusiveMinimum 
      ? zodSchema.gt(schema.minimum) 
      : zodSchema.gte(schema.minimum);
  }

  if (schema.maximum !== undefined) {
    zodSchema = schema.exclusiveMaximum 
      ? zodSchema.lt(schema.maximum) 
      : zodSchema.lte(schema.maximum);
  }

  if (schema.multipleOf !== undefined) {
    zodSchema = zodSchema.multipleOf(schema.multipleOf);
  }

  return zodSchema;
}

/**
 * Create an array schema with validations
 */
function createArraySchema(schema: any): z.ZodArray<z.ZodTypeAny> {
  // If items schema is defined, use it; otherwise, default to any
  const itemsSchema = schema.items 
    ? convertToZodSchema(schema.items) 
    : z.any();

  let zodSchema = z.array(itemsSchema);

  if (schema.minItems !== undefined) {
    zodSchema = zodSchema.min(schema.minItems);
  }

  if (schema.maxItems !== undefined) {
    zodSchema = zodSchema.max(schema.maxItems);
  }

  if (schema.uniqueItems === true) {
    // Not directly supported in Zod, could be implemented with a custom refinement
    // Need to cast the return type to handle the TypeScript error for refine
    return zodSchema.refine(
      (items) => new Set(items).size === items.length,
      { message: 'Array items must be unique' }
    ) as unknown as z.ZodArray<z.ZodTypeAny>;
  }

  return zodSchema;
}

/**
 * Create an object schema with validations
 */
function createObjectSchema(schema: any): z.ZodObject<any> {
  const shape: Record<string, z.ZodTypeAny> = {};

  // Process properties
  if (schema.properties) {
    Object.entries(schema.properties).forEach(([key, propSchema]) => {
      shape[key] = convertToZodSchema(propSchema);
    });
  }

  // Start with a basic object schema
  let zodSchema = z.object(shape);

  // Process required properties
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
    // If no required fields specified, make all fields optional
    Object.keys(shape).forEach(key => {
      shape[key] = shape[key].optional();
    });
    
    // Recreate the object with updated shape
    zodSchema = z.object(shape);
  }

  const baseSchema = zodSchema;

  // Additional properties handling (default is strict in Zod)
  if (schema.additionalProperties === true) {
    // Need to use type assertion to handle TypeScript error
    return baseSchema.passthrough() as z.ZodObject<any>;
  } else if (schema.additionalProperties === false) {
    // Need to use type assertion to handle TypeScript error
    return baseSchema.strict() as z.ZodObject<any>;
  } else if (schema.additionalProperties) {
    // Handle case where additionalProperties is a schema
    // This is not directly supported in Zod
    return baseSchema.passthrough() as z.ZodObject<any>;
  }

  return baseSchema;
}

/**
 * Create a union schema
 */
function createUnionSchema(schemas: any[]): z.ZodTypeAny {
  if (!schemas.length) {
    throw new Error('Union schema requires at least one schema');
  }

  const zodSchemas = schemas.map(schema => convertToZodSchema(schema));
  
  // Handle special cases to avoid TypeScript errors
  if (zodSchemas.length === 1) {
    // For a single schema, just return it directly instead of creating a union
    return zodSchemas[0];
  }
  
  if (zodSchemas.length === 2) {
    // For two schemas, create a simple union
    return z.union([zodSchemas[0], zodSchemas[1]]);
  }
  
  // For more schemas, we need to build the union incrementally
  let unionSchema = z.union([zodSchemas[0], zodSchemas[1]]);
  
  // Add each additional schema to the union
  for (let i = 2; i < zodSchemas.length; i++) {
    // Use a type guard to ensure we have the right types
    // This is a workaround for TypeScript's limitation with z.union
    unionSchema = z.union([unionSchema, zodSchemas[i]]);
  }
  
  return unionSchema;
}

/**
 * Create an intersection schema
 */
function createIntersectionSchema(schemas: any[]): z.ZodIntersection<z.ZodTypeAny, z.ZodTypeAny> {
  if (schemas.length < 2) {
    throw new Error('Intersection schema requires at least two schemas');
  }

  const zodSchemas = schemas.map(schema => convertToZodSchema(schema));
  
  // Start with the first two schemas
  let result = z.intersection(zodSchemas[0], zodSchemas[1]);
  
  // Add any additional schemas
  for (let i = 2; i < zodSchemas.length; i++) {
    result = z.intersection(result, zodSchemas[i]);
  }
  
  return result;
}

// Export the main tag function
export default yaml;