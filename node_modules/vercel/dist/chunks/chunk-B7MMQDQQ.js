import { createRequire as __createRequire } from 'node:module';
import { fileURLToPath as __fileURLToPath } from 'node:url';
import { dirname as __dirname_ } from 'node:path';
const require = __createRequire(import.meta.url);
const __filename = __fileURLToPath(import.meta.url);
const __dirname = __dirname_(__filename);
import {
  output_manager_default
} from "./chunk-I2CIWYG5.js";

// src/util/routes/env.ts
function extractEnvVarNames(value) {
  const names = /* @__PURE__ */ new Set();
  for (const m of value.matchAll(/\$\{?([A-Z_][A-Z0-9_]*)\}?/g)) {
    names.add(m[1]);
  }
  return Array.from(names);
}
function populateRouteEnv(route) {
  const routeEnv = /* @__PURE__ */ new Set();
  if (route.dest) {
    for (const name of extractEnvVarNames(route.dest)) {
      routeEnv.add(name);
    }
  }
  if (route.headers) {
    for (const value of Object.values(route.headers)) {
      for (const name of extractEnvVarNames(value)) {
        routeEnv.add(name);
      }
    }
  }
  route.env = routeEnv.size > 0 ? Array.from(routeEnv) : void 0;
  if (route.transforms) {
    for (const transform of route.transforms) {
      if (transform.args) {
        const argsStr = Array.isArray(transform.args) ? transform.args.join(" ") : transform.args;
        const names = extractEnvVarNames(argsStr);
        transform.env = names.length > 0 ? names : void 0;
      }
    }
  }
}

// src/util/routes/parse-transforms.ts
function parseTransforms(values, type, op) {
  return values.map((value) => parseTransform(value, type, op));
}
function parseTransform(input, type, op) {
  if (op === "delete") {
    const key2 = input.trim();
    if (!key2) {
      throw new Error("Delete operation requires a key");
    }
    return {
      type,
      op,
      target: { key: key2 }
    };
  }
  const eqIndex = input.indexOf("=");
  if (eqIndex === -1) {
    throw new Error(`Invalid format: "${input}". Expected format: key=value`);
  }
  const key = input.slice(0, eqIndex).trim();
  const args = input.slice(eqIndex + 1);
  if (!key) {
    throw new Error("Transform key cannot be empty");
  }
  return {
    type,
    op,
    target: { key },
    args
  };
}
function collectTransforms(flags) {
  const transforms = [];
  if (flags.setResponseHeader) {
    transforms.push(
      ...parseTransforms(flags.setResponseHeader, "response.headers", "set")
    );
  }
  if (flags.appendResponseHeader) {
    transforms.push(
      ...parseTransforms(
        flags.appendResponseHeader,
        "response.headers",
        "append"
      )
    );
  }
  if (flags.deleteResponseHeader) {
    transforms.push(
      ...parseTransforms(
        flags.deleteResponseHeader,
        "response.headers",
        "delete"
      )
    );
  }
  if (flags.setRequestHeader) {
    transforms.push(
      ...parseTransforms(flags.setRequestHeader, "request.headers", "set")
    );
  }
  if (flags.appendRequestHeader) {
    transforms.push(
      ...parseTransforms(flags.appendRequestHeader, "request.headers", "append")
    );
  }
  if (flags.deleteRequestHeader) {
    transforms.push(
      ...parseTransforms(flags.deleteRequestHeader, "request.headers", "delete")
    );
  }
  if (flags.setRequestQuery) {
    transforms.push(
      ...parseTransforms(flags.setRequestQuery, "request.query", "set")
    );
  }
  if (flags.appendRequestQuery) {
    transforms.push(
      ...parseTransforms(flags.appendRequestQuery, "request.query", "append")
    );
  }
  if (flags.deleteRequestQuery) {
    transforms.push(
      ...parseTransforms(flags.deleteRequestQuery, "request.query", "delete")
    );
  }
  return transforms;
}
function collectResponseHeaders(setHeaders) {
  const headers = {};
  for (const input of setHeaders) {
    const eqIndex = input.indexOf("=");
    if (eqIndex === -1) {
      throw new Error(
        `Invalid header format: "${input}". Expected format: key=value`
      );
    }
    const key = input.slice(0, eqIndex).trim();
    const value = input.slice(eqIndex + 1);
    if (!key) {
      throw new Error("Header key cannot be empty");
    }
    headers[key] = value;
  }
  return headers;
}

// src/util/routes/interactive.ts
var MAX_NAME_LENGTH = 256;
var MAX_DESCRIPTION_LENGTH = 1024;
var MAX_CONDITIONS = 16;
var VALID_SYNTAXES = [
  "regex",
  "path-to-regexp",
  "equals"
];
var REDIRECT_STATUS_CODES = [301, 302, 303, 307, 308];
var VALID_ACTION_TYPES = [
  "rewrite",
  "redirect",
  "set-status"
];
var ALL_ACTION_CHOICES = [
  { name: "Rewrite", value: "rewrite", exclusive: true },
  { name: "Redirect", value: "redirect", exclusive: true },
  { name: "Set Status Code", value: "set-status", exclusive: true },
  { name: "Response Headers", value: "response-headers" },
  { name: "Request Headers", value: "request-headers" },
  { name: "Request Query", value: "request-query" }
];
function stripQuotes(str) {
  if (str.startsWith('"') && str.endsWith('"') && str.length >= 2) {
    return str.slice(1, -1);
  }
  if (str.startsWith("'") && str.endsWith("'") && str.length >= 2) {
    return str.slice(1, -1);
  }
  return str;
}
function extractTransformFlags(flags) {
  return {
    setResponseHeader: flags["--set-response-header"],
    appendResponseHeader: flags["--append-response-header"],
    deleteResponseHeader: flags["--delete-response-header"],
    setRequestHeader: flags["--set-request-header"],
    appendRequestHeader: flags["--append-request-header"],
    deleteRequestHeader: flags["--delete-request-header"],
    setRequestQuery: flags["--set-request-query"],
    appendRequestQuery: flags["--append-request-query"],
    deleteRequestQuery: flags["--delete-request-query"]
  };
}
function collectHeadersAndTransforms(transformFlags) {
  const headers = transformFlags.setResponseHeader ? collectResponseHeaders(transformFlags.setResponseHeader) : {};
  const transforms = collectTransforms({
    ...transformFlags,
    setResponseHeader: void 0
    // Already handled in headers
  });
  return { headers, transforms };
}
function hasAnyTransformFlags(flags) {
  const tf = extractTransformFlags(flags);
  return !!(tf.setResponseHeader || tf.appendResponseHeader || tf.deleteResponseHeader || tf.setRequestHeader || tf.appendRequestHeader || tf.deleteRequestHeader || tf.setRequestQuery || tf.appendRequestQuery || tf.deleteRequestQuery);
}
function validateActionFlags(action, dest, status) {
  if (!action) {
    if (dest || status !== void 0) {
      return "--action is required when using --dest or --status. Use --action rewrite, --action redirect, or --action set-status.";
    }
    return null;
  }
  if (!VALID_ACTION_TYPES.includes(action)) {
    return `Invalid action type: "${action}". Valid types: ${VALID_ACTION_TYPES.join(", ")}`;
  }
  switch (action) {
    case "rewrite":
      if (!dest)
        return "--action rewrite requires --dest.";
      if (status !== void 0)
        return "--action rewrite does not accept --status.";
      break;
    case "redirect":
      if (!dest)
        return "--action redirect requires --dest.";
      if (status === void 0)
        return `--action redirect requires --status (${REDIRECT_STATUS_CODES.join(", ")}).`;
      if (!REDIRECT_STATUS_CODES.includes(status))
        return `Invalid redirect status: ${status}. Must be one of: ${REDIRECT_STATUS_CODES.join(", ")}`;
      break;
    case "set-status":
      if (dest)
        return "--action set-status does not accept --dest.";
      if (status === void 0)
        return "--action set-status requires --status.";
      if (status < 100 || status > 599)
        return "Status code must be between 100 and 599.";
      break;
  }
  return null;
}
async function collectActionDetails(client, actionType, flags) {
  switch (actionType) {
    case "rewrite": {
      const dest = await client.input.text({
        message: "Destination URL:",
        validate: (val) => val ? true : "Destination is required"
      });
      Object.assign(flags, { "--dest": dest });
      break;
    }
    case "redirect": {
      const dest = await client.input.text({
        message: "Destination URL:",
        validate: (val) => val ? true : "Destination is required"
      });
      const status = await client.input.select({
        message: "Status code:",
        choices: [
          { name: "307 - Temporary Redirect", value: 307 },
          { name: "308 - Permanent Redirect", value: 308 },
          { name: "301 - Moved Permanently", value: 301 },
          { name: "302 - Found", value: 302 },
          { name: "303 - See Other", value: 303 }
        ]
      });
      Object.assign(flags, { "--dest": dest, "--status": status });
      break;
    }
    case "set-status": {
      const statusCode = await client.input.text({
        message: "HTTP status code:",
        validate: (val) => {
          const num = parseInt(val, 10);
          if (isNaN(num) || num < 100 || num > 599) {
            return "Status code must be between 100 and 599";
          }
          return true;
        }
      });
      Object.assign(flags, { "--status": parseInt(statusCode, 10) });
      break;
    }
    case "response-headers": {
      await collectInteractiveHeaders(client, "response", flags);
      break;
    }
    case "request-headers": {
      await collectInteractiveHeaders(client, "request-header", flags);
      break;
    }
    case "request-query": {
      await collectInteractiveHeaders(client, "request-query", flags);
      break;
    }
  }
}
async function collectInteractiveConditions(client, flags) {
  let addMore = true;
  while (addMore) {
    const currentHas = flags["--has"] || [];
    const currentMissing = flags["--missing"] || [];
    if (currentHas.length > 0 || currentMissing.length > 0) {
      output_manager_default.log("\nCurrent conditions:");
      for (const c of currentHas) {
        output_manager_default.print(`  has: ${c}
`);
      }
      for (const c of currentMissing) {
        output_manager_default.print(`  missing: ${c}
`);
      }
      output_manager_default.print("\n");
    }
    const conditionType = await client.input.select({
      message: "Condition type:",
      choices: [
        { name: "has - Request must have this", value: "has" },
        { name: "missing - Request must NOT have this", value: "missing" }
      ]
    });
    const targetType = await client.input.select({
      message: "What to check:",
      choices: [
        { name: "Header", value: "header" },
        { name: "Cookie", value: "cookie" },
        { name: "Query Parameter", value: "query" },
        { name: "Host", value: "host" }
      ]
    });
    let conditionValue;
    if (targetType === "host") {
      const operator = await client.input.select({
        message: "How to match the host:",
        choices: [
          { name: "Equals", value: "eq" },
          { name: "Contains", value: "contains" },
          { name: "Matches (regex)", value: "re" }
        ]
      });
      const hostInput = await client.input.text({
        message: operator === "re" ? "Host pattern (regex):" : "Host value:",
        validate: (val) => {
          if (!val)
            return "Host value is required";
          if (operator === "re") {
            try {
              new RegExp(val);
              return true;
            } catch {
              return "Invalid regex pattern";
            }
          }
          return true;
        }
      });
      conditionValue = `host:${operator}=${hostInput}`;
    } else {
      const key = await client.input.text({
        message: `${targetType.charAt(0).toUpperCase() + targetType.slice(1)} name:`,
        validate: (val) => val ? true : `${targetType} name is required`
      });
      const operator = await client.input.select({
        message: "How to match the value:",
        choices: [
          { name: "Exists (any value)", value: "exists" },
          { name: "Equals", value: "eq" },
          { name: "Contains", value: "contains" },
          { name: "Matches (regex)", value: "re" }
        ]
      });
      if (operator === "exists") {
        conditionValue = `${targetType}:${key}:exists`;
      } else {
        const valueInput = await client.input.text({
          message: operator === "re" ? "Value pattern (regex):" : "Value:",
          validate: (val) => {
            if (!val)
              return "Value is required";
            if (operator === "re") {
              try {
                new RegExp(val);
                return true;
              } catch {
                return "Invalid regex pattern";
              }
            }
            return true;
          }
        });
        conditionValue = `${targetType}:${key}:${operator}=${valueInput}`;
      }
    }
    const flagName = conditionType === "has" ? "--has" : "--missing";
    const existing = flags[flagName] || [];
    flags[flagName] = [...existing, conditionValue];
    const totalConditions = (flags["--has"] || []).length + (flags["--missing"] || []).length;
    if (totalConditions >= MAX_CONDITIONS) {
      output_manager_default.warn(`Maximum ${MAX_CONDITIONS} conditions reached.`);
      break;
    }
    addMore = await client.input.confirm("Add another condition?", false);
  }
}
function formatCollectedItems(flags, type) {
  const items = [];
  const prefix = type === "response" ? "response-header" : type === "request-header" ? "request-header" : "request-query";
  const setItems = flags[`--set-${prefix}`] || [];
  const appendItems = flags[`--append-${prefix}`] || [];
  const deleteItems = flags[`--delete-${prefix}`] || [];
  for (const item of setItems) {
    items.push(`  set: ${item}`);
  }
  for (const item of appendItems) {
    items.push(`  append: ${item}`);
  }
  for (const item of deleteItems) {
    items.push(`  delete: ${item}`);
  }
  return items;
}
async function collectInteractiveHeaders(client, type, flags) {
  const flagName = type === "response" ? "--set-response-header" : type === "request-header" ? "--set-request-header" : "--set-request-query";
  const sectionName = type === "response" ? "Response Headers" : type === "request-header" ? "Request Headers" : "Request Query Parameters";
  const itemName = type === "response" ? "response header" : type === "request-header" ? "request header" : "query parameter";
  output_manager_default.log(`
--- ${sectionName} ---`);
  let addMore = true;
  while (addMore) {
    const collected = formatCollectedItems(flags, type);
    if (collected.length > 0) {
      output_manager_default.log(`
Current ${sectionName.toLowerCase()}:`);
      for (const item of collected) {
        output_manager_default.print(`${item}
`);
      }
      output_manager_default.print("\n");
    }
    const op = await client.input.select({
      message: `${sectionName} operation:`,
      choices: [
        { name: "Set", value: "set" },
        { name: "Append", value: "append" },
        { name: "Delete", value: "delete" }
      ]
    });
    const key = await client.input.text({
      message: `${itemName.charAt(0).toUpperCase() + itemName.slice(1)} name:`,
      validate: (val) => val ? true : `${itemName} name is required`
    });
    if (op === "delete") {
      const opFlagName = flagName.replace("--set-", "--delete-");
      const existing = flags[opFlagName] || [];
      flags[opFlagName] = [...existing, key];
    } else {
      const value = await client.input.text({
        message: `${itemName.charAt(0).toUpperCase() + itemName.slice(1)} value:`
      });
      const opFlagName = op === "append" ? flagName.replace("--set-", "--append-") : flagName;
      const existing = flags[opFlagName] || [];
      flags[opFlagName] = [...existing, `${key}=${value}`];
    }
    addMore = await client.input.confirm(`Add another ${itemName}?`, false);
  }
}

export {
  populateRouteEnv,
  MAX_NAME_LENGTH,
  MAX_DESCRIPTION_LENGTH,
  MAX_CONDITIONS,
  VALID_SYNTAXES,
  REDIRECT_STATUS_CODES,
  VALID_ACTION_TYPES,
  ALL_ACTION_CHOICES,
  stripQuotes,
  extractTransformFlags,
  collectHeadersAndTransforms,
  hasAnyTransformFlags,
  validateActionFlags,
  collectActionDetails,
  collectInteractiveConditions,
  collectInteractiveHeaders
};
