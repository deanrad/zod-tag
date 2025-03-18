# Limitations and Challenges

This document outlines the current limitations and challenges of the `zod-tag` library, which uses a tagged template literal approach to convert YAML strings into Zod schemas.

## Current Limitations

### JSON Schema References (`$ref`)

**Challenge:** JSON Schema allows defining reusable schema components and referencing them with `$ref` pointers. For example:

```yaml
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
```

This feature is crucial for schema reuse but requires resolver logic that would:
1. Parse all definitions in the schema
2. Maintain a reference map
3. Resolve references when encountered (which may be recursive)
4. Handle circular references

**Possible Solutions:**
- Implement a pre-processing step that resolves all references before schema conversion
- Add syntax support for named schemas that can be referenced elsewhere

### Advanced Pattern Validation

**Challenge:** JSON Schema offers more advanced pattern validation options that don't have direct equivalents in Zod:

- `patternProperties`: Apply schemas to properties matching a pattern
- Complex schema compositions (allOf, anyOf, not) beyond what's currently implemented

**Possible Solution:**
- Custom refinements and transformations in Zod to simulate these features

### Custom Formats

**Challenge:** JSON Schema's `format` keyword offers many predefined formats (email, uri, date-time, etc.) not all of which have direct Zod equivalents.

**Possible Solution:**
- Create a format registry with custom validators for each format type

### Zod-Specific Features

**Challenge:** Zod offers many powerful features that aren't represented in standard JSON Schema:

- Transformations
- Effects (refine, transform, preprocessing)
- Branded types
- Recursive types

**Possible Solution:**
- Extend YAML syntax with custom directives or properties that map to these Zod-specific features

Example syntax extension (not currently implemented):

```yaml
type: string
transform:
  - toLowerCase: true  # Custom property to represent Zod's transform
zod:refine:   # Custom property for refinements
  message: "Must be a valid username"
  test: "value => value.length > 3 && /^[a-z0-9]+$/.test(value)"
```

### Schema Type Inference

**Challenge:** One of Zod's strengths is TypeScript integration, but inferring accurate types from YAML-defined schemas is challenging.

**Possible Solution:**
- Generate TypeScript type declarations alongside schemas
- Provide helper utilities for type extraction

## Implementation Considerations

1. **Performance:** The current implementation parses and converts the schema on each template literal invocation. For repeated use, a caching mechanism could improve performance.

2. **Error Reporting:** Enhancing error messages to point to the specific location in the YAML where validation failed would improve developer experience.

3. **Type Safety:** While the library provides runtime type validation, enhancing static type inference from YAML would make it more powerful.

4. **Custom Extensions:** Creating a well-defined syntax for extending the YAML schema format to support Zod-specific features without breaking compatibility.

## Future Directions

1. Support for JSON Schema Draft 2020-12 features
2. Better TypeScript type inference
3. Schema composition helpers
4. Integration with OpenAPI/Swagger
5. Documentation generation