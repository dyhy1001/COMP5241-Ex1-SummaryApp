import { createRequire as __createRequire } from 'node:module';
import { fileURLToPath as __fileURLToPath } from 'node:url';
import { dirname as __dirname_ } from 'node:path';
const require = __createRequire(import.meta.url);
const __filename = __fileURLToPath(import.meta.url);
const __dirname = __dirname_(__filename);

// src/util/routes/parse-conditions.ts
var CONDITION_OPERATORS = [
  "eq",
  "contains",
  "re",
  "exists"
];
function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function buildConditionValue(operator, value) {
  if (operator === "exists")
    return void 0;
  if (operator === "re")
    return value;
  const escapedValue = escapeRegExp(value);
  if (operator === "contains")
    return `.*${escapedValue}.*`;
  return `^${escapedValue}$`;
}
function validateRegexPattern(pattern, context) {
  try {
    new RegExp(pattern);
  } catch (e) {
    throw new Error(
      `Invalid regex in ${context}: "${pattern}". ${e instanceof Error ? e.message : ""}`
    );
  }
}
function parseOperatorValue(valuePart) {
  if (valuePart === "exists") {
    return { operator: "exists", rawValue: "" };
  }
  const eqIdx = valuePart.indexOf("=");
  if (eqIdx === -1)
    return null;
  const maybeOp = valuePart.slice(0, eqIdx);
  if (CONDITION_OPERATORS.includes(maybeOp)) {
    return {
      operator: maybeOp,
      rawValue: valuePart.slice(eqIdx + 1)
    };
  }
  return null;
}
function parseConditions(conditions) {
  return conditions.map(parseCondition);
}
function parseCondition(condition) {
  const parts = condition.split(":");
  if (parts.length < 2) {
    throw new Error(
      `Invalid condition format: "${condition}". Expected format: type:key or type:key:value`
    );
  }
  const type = parts[0].toLowerCase();
  const validTypes = ["header", "cookie", "query", "host"];
  if (!validTypes.includes(type)) {
    throw new Error(
      `Invalid condition type: "${type}". Valid types: ${validTypes.join(", ")}`
    );
  }
  if (type === "host") {
    const rawValue = parts.slice(1).join(":");
    if (!rawValue) {
      throw new Error("Host condition requires a value");
    }
    const opResult2 = parseOperatorValue(rawValue);
    if (opResult2) {
      if (opResult2.operator === "exists") {
        throw new Error(
          'Host condition does not support "exists" operator (host always has a value)'
        );
      }
      if (opResult2.operator !== "re" && !opResult2.rawValue) {
        throw new Error(
          `Host condition with "${opResult2.operator}" operator requires a value`
        );
      }
      const compiledValue = buildConditionValue(
        opResult2.operator,
        opResult2.rawValue
      );
      if (compiledValue !== void 0) {
        validateRegexPattern(compiledValue, "host condition");
      }
      return { type: "host", value: compiledValue };
    }
    validateRegexPattern(rawValue, "host condition");
    return { type: "host", value: rawValue };
  }
  const key = parts[1];
  if (!key) {
    throw new Error(`${type} condition requires a key`);
  }
  const valuePart = parts.length > 2 ? parts.slice(2).join(":") : void 0;
  if (valuePart === void 0) {
    return { type, key };
  }
  const opResult = parseOperatorValue(valuePart);
  if (opResult) {
    if (opResult.operator === "exists") {
      return { type, key };
    }
    if (opResult.operator !== "re" && !opResult.rawValue) {
      throw new Error(
        `Condition "${opResult.operator}" operator requires a value after "="`
      );
    }
    const compiledValue = buildConditionValue(
      opResult.operator,
      opResult.rawValue
    );
    if (compiledValue !== void 0) {
      validateRegexPattern(compiledValue, `${type} condition value`);
    }
    return {
      type,
      key,
      ...compiledValue !== void 0 && { value: compiledValue }
    };
  }
  validateRegexPattern(valuePart, `${type} condition value`);
  return {
    type,
    key,
    value: valuePart
  };
}
function formatCondition(field) {
  if (field.type === "host") {
    return `host:${field.value}`;
  }
  if (field.value) {
    return `${field.type}:${field.key}:${field.value}`;
  }
  return `${field.type}:${field.key}`;
}

export {
  escapeRegExp,
  buildConditionValue,
  parseConditions,
  parseCondition,
  formatCondition
};
