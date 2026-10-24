/**
 * Minimal JSON Schema 2020-12 validator for the test suite.
 *
 * It supports only the keywords used by schema/report.schema.json:
 * $ref, type, const, enum, pattern, minLength, minimum, maximum,
 * required, properties, items and additionalProperties.
 * That keeps the dependency count at zero and the validator small enough
 * to audit alongside the contract it checks.
 */

export function validate(schema, value, root = schema, path = '$') {
  if (schema && typeof schema.$ref === 'string') {
    const target = resolve(root, schema.$ref);
    if (!target) return [`${path}: unresolved $ref ${schema.$ref}`];
    return validate(target, value, root, path);
  }

  if (schema.type) {
    const types = Array.isArray(schema.type) ? schema.type : [schema.type];
    if (!types.some((type) => matchesType(type, value))) {
      return [`${path}: expected ${types.join(' | ')}`];
    }
  }

  const errors = [];

  if (Object.prototype.hasOwnProperty.call(schema, 'const') && value !== schema.const) {
    errors.push(`${path}: expected constant ${JSON.stringify(schema.const)}`);
  }
  if (Array.isArray(schema.enum) && !schema.enum.includes(value)) {
    errors.push(`${path}: expected one of ${schema.enum.map((item) => JSON.stringify(item)).join(', ')}`);
  }
  if (typeof value === 'number') {
    if (schema.minimum !== undefined && value < schema.minimum) errors.push(`${path}: below minimum ${schema.minimum}`);
    if (schema.maximum !== undefined && value > schema.maximum) errors.push(`${path}: above maximum ${schema.maximum}`);
  }
  if (typeof value === 'string') {
    if (schema.minLength !== undefined && value.length < schema.minLength) {
      errors.push(`${path}: shorter than ${schema.minLength}`);
    }
    if (schema.pattern !== undefined && !new RegExp(schema.pattern).test(value)) {
      errors.push(`${path}: does not match ${schema.pattern}`);
    }
  }
  if (Array.isArray(value) && schema.items) {
    value.forEach((item, index) => {
      errors.push(...validate(schema.items, item, root, `${path}[${index}]`));
    });
  }
  if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
    for (const key of schema.required ?? []) {
      if (!Object.prototype.hasOwnProperty.call(value, key)) errors.push(`${path}: missing ${key}`);
    }
    const properties = schema.properties ?? {};
    for (const [key, child] of Object.entries(properties)) {
      if (Object.prototype.hasOwnProperty.call(value, key)) {
        errors.push(...validate(child, value[key], root, `${path}.${key}`));
      }
    }
    if (schema.additionalProperties === false) {
      for (const key of Object.keys(value)) {
        if (!Object.prototype.hasOwnProperty.call(properties, key)) errors.push(`${path}: unexpected ${key}`);
      }
    }
  }

  return errors;
}

function matchesType(type, value) {
  switch (type) {
    case 'object':
      return value !== null && typeof value === 'object' && !Array.isArray(value);
    case 'array':
      return Array.isArray(value);
    case 'integer':
      return Number.isInteger(value);
    case 'number':
      return typeof value === 'number' && Number.isFinite(value);
    case 'string':
      return typeof value === 'string';
    case 'boolean':
      return typeof value === 'boolean';
    case 'null':
      return value === null;
    default:
      return false;
  }
}

function resolve(root, ref) {
  if (!ref.startsWith('#/')) return null;
  return ref
    .slice(2)
    .split('/')
    .map((part) => part.replace(/~1/g, '/').replace(/~0/g, '~'))
    .reduce((node, part) => (node == null ? undefined : node[part]), root);
}
