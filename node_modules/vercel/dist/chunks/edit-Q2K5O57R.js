import { createRequire as __createRequire } from 'node:module';
import { fileURLToPath as __fileURLToPath } from 'node:url';
import { dirname as __dirname_ } from 'node:path';
const require = __createRequire(import.meta.url);
const __filename = __fileURLToPath(import.meta.url);
const __dirname = __dirname_(__filename);
import {
  editRoute
} from "./chunk-P3SKP5WM.js";
import {
  MAX_CONDITIONS,
  MAX_DESCRIPTION_LENGTH,
  MAX_NAME_LENGTH,
  REDIRECT_STATUS_CODES,
  VALID_ACTION_TYPES,
  VALID_SYNTAXES,
  collectActionDetails,
  collectHeadersAndTransforms,
  collectInteractiveConditions,
  collectInteractiveHeaders,
  extractTransformFlags,
  hasAnyTransformFlags,
  populateRouteEnv,
  stripQuotes
} from "./chunk-B7MMQDQQ.js";
import {
  getRouteVersions
} from "./chunk-AHU7WNL2.js";
import {
  ensureProjectLink,
  formatCondition,
  formatTransform,
  getRoutes,
  offerAutoPromote,
  parseSubcommandArgs,
  resolveRoute
} from "./chunk-WUMIOXFA.js";
import {
  parseConditions
} from "./chunk-PENYWZQA.js";
import {
  editSubcommand
} from "./chunk-LTTGCN2M.js";
import "./chunk-TQJBKJCP.js";
import "./chunk-OYLVZVKK.js";
import {
  stamp_default
} from "./chunk-CO5D46AG.js";
import {
  getCommandName
} from "./chunk-6AFO56VB.js";
import "./chunk-3XFFP2BA.js";
import {
  output_manager_default
} from "./chunk-I2CIWYG5.js";
import {
  require_source
} from "./chunk-S7KYDPEM.js";
import {
  __toESM
} from "./chunk-TZ2YI2VH.js";

// src/commands/routes/edit.ts
var import_chalk = __toESM(require_source(), 1);
function getPrimaryActionType(route) {
  const { dest, status } = route.route;
  if (dest && status && REDIRECT_STATUS_CODES.includes(status)) {
    return "redirect";
  }
  if (dest)
    return "rewrite";
  if (status)
    return "set-status";
  return null;
}
function getPrimaryActionLabel(route) {
  const actionType = getPrimaryActionType(route);
  switch (actionType) {
    case "rewrite":
      return `Rewrite \u2192 ${route.route.dest}`;
    case "redirect":
      return `Redirect \u2192 ${route.route.dest} (${route.route.status})`;
    case "set-status":
      return `Set Status ${route.route.status}`;
    default:
      return "(none)";
  }
}
function getResponseHeaders(route) {
  const headers = route.route.headers ?? {};
  return Object.entries(headers).map(([key, value]) => ({ key, value }));
}
function getTransformsByType(route, type) {
  const transforms = route.route.transforms ?? [];
  return transforms.filter((t) => t.type === type);
}
function printRouteConfig(route) {
  output_manager_default.print("\n");
  output_manager_default.print(`  ${import_chalk.default.cyan("Name:")}         ${route.name}
`);
  if (route.description) {
    output_manager_default.print(`  ${import_chalk.default.cyan("Description:")}  ${route.description}
`);
  }
  output_manager_default.print(
    `  ${import_chalk.default.cyan("Source:")}       ${route.route.src}  ${import_chalk.default.gray(`(${route.srcSyntax ?? "regex"})`)}
`
  );
  output_manager_default.print(
    `  ${import_chalk.default.cyan("Status:")}       ${route.enabled === false ? import_chalk.default.red("Disabled") : import_chalk.default.green("Enabled")}
`
  );
  const actionLabel = getPrimaryActionLabel(route);
  output_manager_default.print(`  ${import_chalk.default.cyan("Action:")}       ${actionLabel}
`);
  const hasConds = route.route.has ?? [];
  if (hasConds.length > 0) {
    output_manager_default.print(`
  ${import_chalk.default.cyan("Has conditions:")}
`);
    for (const c of hasConds) {
      output_manager_default.print(`    ${formatCondition(c)}
`);
    }
  }
  const missingConds = route.route.missing ?? [];
  if (missingConds.length > 0) {
    output_manager_default.print(`
  ${import_chalk.default.cyan("Missing conditions:")}
`);
    for (const c of missingConds) {
      output_manager_default.print(`    ${formatCondition(c)}
`);
    }
  }
  const responseHeaders = getResponseHeaders(route);
  if (responseHeaders.length > 0) {
    output_manager_default.print(`
  ${import_chalk.default.cyan("Response Headers:")}
`);
    for (const h of responseHeaders) {
      output_manager_default.print(`    ${import_chalk.default.cyan(h.key)} = ${h.value}
`);
    }
  }
  const requestHeaders = getTransformsByType(route, "request.headers");
  if (requestHeaders.length > 0) {
    output_manager_default.print(`
  ${import_chalk.default.cyan("Request Headers:")}
`);
    for (const t of requestHeaders) {
      output_manager_default.print(`    ${formatTransform(t)}
`);
    }
  }
  const requestQuery = getTransformsByType(route, "request.query");
  if (requestQuery.length > 0) {
    output_manager_default.print(`
  ${import_chalk.default.cyan("Request Query:")}
`);
    for (const t of requestQuery) {
      output_manager_default.print(`    ${formatTransform(t)}
`);
    }
  }
  output_manager_default.print("\n");
}
function cloneRoute(route) {
  return JSON.parse(JSON.stringify(route));
}
function applyFlagMutations(route, flags) {
  if (flags["--name"] !== void 0) {
    const name = flags["--name"];
    if (name.length > MAX_NAME_LENGTH) {
      return `Name must be ${MAX_NAME_LENGTH} characters or less.`;
    }
    route.name = name;
  }
  if (flags["--description"] !== void 0) {
    const desc = flags["--description"];
    if (desc.length > MAX_DESCRIPTION_LENGTH) {
      return `Description must be ${MAX_DESCRIPTION_LENGTH} characters or less.`;
    }
    route.description = desc || void 0;
  }
  if (flags["--src"] !== void 0) {
    route.route.src = stripQuotes(flags["--src"]);
  }
  if (flags["--src-syntax"] !== void 0) {
    const syntax = flags["--src-syntax"];
    if (!VALID_SYNTAXES.includes(syntax)) {
      return `Invalid syntax: "${syntax}". Valid options: ${VALID_SYNTAXES.join(", ")}`;
    }
    route.srcSyntax = syntax;
  }
  const actionFlag = flags["--action"];
  const destFlag = flags["--dest"];
  const statusFlag = flags["--status"];
  const noDest = flags["--no-dest"];
  const noStatus = flags["--no-status"];
  if (actionFlag) {
    if (!VALID_ACTION_TYPES.includes(actionFlag)) {
      return `Invalid action type: "${actionFlag}". Valid types: ${VALID_ACTION_TYPES.join(", ")}`;
    }
    switch (actionFlag) {
      case "rewrite": {
        const dest = destFlag ? stripQuotes(destFlag) : void 0;
        if (!dest)
          return "--action rewrite requires --dest.";
        route.route.dest = dest;
        delete route.route.status;
        break;
      }
      case "redirect": {
        const dest = destFlag ? stripQuotes(destFlag) : void 0;
        if (!dest)
          return "--action redirect requires --dest.";
        if (statusFlag === void 0)
          return `--action redirect requires --status (${REDIRECT_STATUS_CODES.join(", ")}).`;
        if (!REDIRECT_STATUS_CODES.includes(statusFlag))
          return `Invalid redirect status: ${statusFlag}. Must be one of: ${REDIRECT_STATUS_CODES.join(", ")}`;
        route.route.dest = dest;
        route.route.status = statusFlag;
        break;
      }
      case "set-status": {
        if (statusFlag === void 0)
          return "--action set-status requires --status.";
        if (statusFlag < 100 || statusFlag > 599)
          return "Status code must be between 100 and 599.";
        delete route.route.dest;
        route.route.status = statusFlag;
        break;
      }
    }
  } else {
    if (destFlag !== void 0) {
      route.route.dest = stripQuotes(destFlag);
    }
    if (statusFlag !== void 0) {
      route.route.status = statusFlag;
    }
    if (noDest) {
      delete route.route.dest;
    }
    if (noStatus) {
      delete route.route.status;
    }
  }
  if (flags["--clear-conditions"]) {
    route.route.has = [];
    route.route.missing = [];
  }
  if (flags["--clear-headers"]) {
    route.route.headers = {};
  }
  if (flags["--clear-transforms"]) {
    route.route.transforms = [];
  }
  const transformFlags = extractTransformFlags(flags);
  try {
    const { headers, transforms } = collectHeadersAndTransforms(transformFlags);
    if (Object.keys(headers).length > 0) {
      route.route.headers = {
        ...route.route.headers ?? {},
        ...headers
      };
    }
    if (transforms.length > 0) {
      const existing = route.route.transforms ?? [];
      route.route.transforms = [...existing, ...transforms];
    }
  } catch (e) {
    return `Invalid transform format. ${e instanceof Error ? e.message : ""}`;
  }
  const hasFlags = flags["--has"];
  const missingFlags = flags["--missing"];
  try {
    if (hasFlags) {
      const newHas = parseConditions(hasFlags);
      const existingHas = route.route.has ?? [];
      route.route.has = [...existingHas, ...newHas];
    }
    if (missingFlags) {
      const newMissing = parseConditions(missingFlags);
      const existingMissing = route.route.missing ?? [];
      route.route.missing = [...existingMissing, ...newMissing];
    }
  } catch (e) {
    return e instanceof Error ? e.message : "Invalid condition format";
  }
  const totalConditions = (route.route.has ?? []).length + (route.route.missing ?? []).length;
  if (totalConditions > MAX_CONDITIONS) {
    return `Too many conditions: ${totalConditions}. Maximum is ${MAX_CONDITIONS}.`;
  }
  const hasDest = !!route.route.dest;
  const hasStatus = !!route.route.status;
  const hasHeaders = Object.keys(route.route.headers ?? {}).length > 0;
  const hasTransforms = (route.route.transforms ?? []).length > 0;
  if (!hasDest && !hasStatus && !hasHeaders && !hasTransforms) {
    return "This edit would leave the route with no action. Add --action, headers, or transforms.";
  }
  return null;
}
async function editName(client, route) {
  const name = await client.input.text({
    message: `Name (current: ${route.name}):`,
    validate: (val) => {
      if (!val)
        return "Route name is required";
      if (val.length > MAX_NAME_LENGTH)
        return `Name must be ${MAX_NAME_LENGTH} characters or less`;
      return true;
    }
  });
  route.name = name;
}
async function editDescription(client, route) {
  const desc = await client.input.text({
    message: `Description${route.description ? ` (current: ${route.description})` : ""}:`,
    validate: (val) => val && val.length > MAX_DESCRIPTION_LENGTH ? `Description must be ${MAX_DESCRIPTION_LENGTH} characters or less` : true
  });
  route.description = desc || void 0;
}
async function editSource(client, route) {
  const syntaxChoice = await client.input.select({
    message: `Path syntax (current: ${route.srcSyntax ?? "regex"}):`,
    choices: [
      {
        name: "Path pattern (e.g., /api/:version/users/:id)",
        value: "path-to-regexp"
      },
      { name: "Exact match (e.g., /about)", value: "equals" },
      { name: "Regular expression (e.g., ^/api/(.*)$)", value: "regex" }
    ]
  });
  route.srcSyntax = syntaxChoice;
  const src = await client.input.text({
    message: `Path pattern (current: ${route.route.src}):`,
    validate: (val) => {
      if (!val)
        return "Path pattern is required";
      return true;
    }
  });
  route.route.src = src;
}
async function editPrimaryAction(client, route) {
  const currentType = getPrimaryActionType(route);
  const choices = [];
  if (currentType === "rewrite" || currentType === "redirect") {
    choices.push({ name: "Change destination", value: "change-dest" });
  }
  if (currentType === "redirect" || currentType === "set-status") {
    choices.push({ name: "Change status code", value: "change-status" });
  }
  if (currentType !== "rewrite") {
    choices.push({ name: "Switch to Rewrite", value: "switch-rewrite" });
  }
  if (currentType !== "redirect") {
    choices.push({ name: "Switch to Redirect", value: "switch-redirect" });
  }
  if (currentType !== "set-status") {
    choices.push({
      name: "Switch to Set Status Code",
      value: "switch-set-status"
    });
  }
  if (currentType) {
    choices.push({
      name: "Remove primary action",
      value: "remove"
    });
  } else {
    choices.push({ name: "Add Rewrite", value: "switch-rewrite" });
    choices.push({ name: "Add Redirect", value: "switch-redirect" });
    choices.push({ name: "Add Set Status Code", value: "switch-set-status" });
  }
  choices.push({ name: "Back", value: "back" });
  const action = await client.input.select({
    message: `Primary action (current: ${getPrimaryActionLabel(route)}):`,
    choices
  });
  const flags = {};
  switch (action) {
    case "change-dest": {
      const dest = await client.input.text({
        message: `Destination (current: ${route.route.dest}):`,
        validate: (val) => val ? true : "Destination is required"
      });
      route.route.dest = dest;
      break;
    }
    case "change-status": {
      if (currentType === "redirect") {
        const status = await client.input.select({
          message: `Status code (current: ${route.route.status}):`,
          choices: [
            { name: "307 - Temporary Redirect", value: 307 },
            { name: "308 - Permanent Redirect", value: 308 },
            { name: "301 - Moved Permanently", value: 301 },
            { name: "302 - Found", value: 302 },
            { name: "303 - See Other", value: 303 }
          ]
        });
        route.route.status = status;
      } else {
        const statusCode = await client.input.text({
          message: `Status code (current: ${route.route.status}):`,
          validate: (val) => {
            const num = parseInt(val, 10);
            if (isNaN(num) || num < 100 || num > 599) {
              return "Status code must be between 100 and 599";
            }
            return true;
          }
        });
        route.route.status = parseInt(statusCode, 10);
      }
      break;
    }
    case "switch-rewrite": {
      await collectActionDetails(client, "rewrite", flags);
      route.route.dest = flags["--dest"];
      delete route.route.status;
      break;
    }
    case "switch-redirect": {
      await collectActionDetails(client, "redirect", flags);
      route.route.dest = flags["--dest"];
      route.route.status = flags["--status"];
      break;
    }
    case "switch-set-status": {
      await collectActionDetails(client, "set-status", flags);
      delete route.route.dest;
      route.route.status = flags["--status"];
      break;
    }
    case "remove": {
      delete route.route.dest;
      delete route.route.status;
      break;
    }
  }
}
async function editConditions(client, route) {
  for (; ; ) {
    const hasConds = route.route.has ?? [];
    const missingConds = route.route.missing ?? [];
    if (hasConds.length > 0 || missingConds.length > 0) {
      output_manager_default.print("\n");
      if (hasConds.length > 0) {
        output_manager_default.print(`  ${import_chalk.default.cyan("Has conditions:")}
`);
        hasConds.forEach((c, i) => {
          output_manager_default.print(
            `    ${import_chalk.default.gray(`${i + 1}.`)} ${formatCondition(c)}
`
          );
        });
      }
      if (missingConds.length > 0) {
        output_manager_default.print(`  ${import_chalk.default.cyan("Missing conditions:")}
`);
        missingConds.forEach((c, i) => {
          output_manager_default.print(
            `    ${import_chalk.default.gray(`${hasConds.length + i + 1}.`)} ${formatCondition(c)}
`
          );
        });
      }
      output_manager_default.print("\n");
    } else {
      output_manager_default.print("\n  No conditions set.\n\n");
    }
    const choices = [];
    if (hasConds.length > 0 || missingConds.length > 0) {
      choices.push({ name: "Remove a condition", value: "remove" });
    }
    choices.push({ name: "Add a new condition", value: "add" });
    choices.push({ name: "Back", value: "back" });
    const action = await client.input.select({
      message: "Conditions:",
      choices
    });
    if (action === "back")
      break;
    if (action === "remove") {
      const allConds = [
        ...hasConds.map((c, i) => ({
          label: `[has] ${formatCondition(c)}`,
          idx: i,
          kind: "has"
        })),
        ...missingConds.map((c, i) => ({
          label: `[missing] ${formatCondition(c)}`,
          idx: i,
          kind: "missing"
        }))
      ];
      const toRemove = await client.input.select({
        message: "Select condition to remove:",
        choices: [
          ...allConds.map((c, i) => ({
            name: c.label,
            value: i
          })),
          { name: "Cancel", value: -1 }
        ]
      });
      if (toRemove !== -1) {
        const selected = allConds[toRemove];
        if (selected.kind === "has") {
          hasConds.splice(selected.idx, 1);
          route.route.has = hasConds;
        } else {
          missingConds.splice(selected.idx, 1);
          route.route.missing = missingConds;
        }
      }
    }
    if (action === "add") {
      const { formatCondition: formatCond } = await import("./parse-conditions-R3OD73CF.js");
      const existingHasStrings = hasConds.map(
        (c) => formatCond(c)
      );
      const existingMissingStrings = missingConds.map(
        (c) => formatCond(c)
      );
      const tempFlags = {
        "--has": existingHasStrings.length > 0 ? existingHasStrings : void 0,
        "--missing": existingMissingStrings.length > 0 ? existingMissingStrings : void 0
      };
      const hasBefore = existingHasStrings.length;
      const missingBefore = existingMissingStrings.length;
      await collectInteractiveConditions(client, tempFlags);
      const allHas = tempFlags["--has"] || [];
      const allMissing = tempFlags["--missing"] || [];
      const newHas = allHas.slice(hasBefore);
      const newMissing = allMissing.slice(missingBefore);
      if (newHas.length > 0) {
        const parsed = parseConditions(newHas);
        const existing = route.route.has ?? [];
        route.route.has = [...existing, ...parsed];
      }
      if (newMissing.length > 0) {
        const parsed = parseConditions(newMissing);
        const existing = route.route.missing ?? [];
        route.route.missing = [...existing, ...parsed];
      }
      break;
    }
  }
}
function getAllResponseHeaders(route) {
  const items = [];
  for (const [key, value] of Object.entries(route.route.headers ?? {})) {
    items.push({ op: "set", key, value, source: "headers" });
  }
  const transforms = route.route.transforms ?? [];
  for (const t of transforms) {
    if (t.type === "response.headers") {
      items.push({
        op: t.op,
        key: typeof t.target.key === "string" ? t.target.key : JSON.stringify(t.target.key),
        value: typeof t.args === "string" ? t.args : void 0,
        source: "transform"
      });
    }
  }
  return items;
}
function formatResponseHeaderItem(item) {
  if (item.op === "delete") {
    return `${import_chalk.default.yellow(item.op)} ${import_chalk.default.cyan(item.key)}`;
  }
  return `${import_chalk.default.yellow(item.op)} ${import_chalk.default.cyan(item.key)} = ${item.value}`;
}
async function editResponseHeaders(client, route) {
  for (; ; ) {
    const allHeaders = getAllResponseHeaders(route);
    if (allHeaders.length > 0) {
      output_manager_default.print("\n");
      output_manager_default.print(`  ${import_chalk.default.cyan("Response Headers:")}
`);
      allHeaders.forEach((h, i) => {
        output_manager_default.print(
          `    ${import_chalk.default.gray(`${i + 1}.`)} ${formatResponseHeaderItem(h)}
`
        );
      });
      output_manager_default.print("\n");
    } else {
      output_manager_default.print("\n  No response headers set.\n\n");
    }
    const choices = [];
    if (allHeaders.length > 0) {
      choices.push({ name: "Remove a response header", value: "remove" });
    }
    choices.push({ name: "Add a response header", value: "add" });
    choices.push({ name: "Back", value: "back" });
    const action = await client.input.select({
      message: "Response Headers:",
      choices
    });
    if (action === "back")
      break;
    if (action === "remove") {
      const toRemove = await client.input.select({
        message: "Select response header to remove:",
        choices: [
          ...allHeaders.map((h, i) => ({
            name: h.op === "delete" ? `${h.op} ${h.key}` : `${h.op} ${h.key} = ${h.value}`,
            value: i
          })),
          { name: "Cancel", value: -1 }
        ]
      });
      if (toRemove !== -1) {
        const item = allHeaders[toRemove];
        if (item.source === "headers") {
          const currentHeaders = { ...route.route.headers ?? {} };
          delete currentHeaders[item.key];
          route.route.headers = currentHeaders;
        } else {
          const transforms = route.route.transforms ?? [];
          const idx = transforms.findIndex(
            (t) => t.type === "response.headers" && t.op === item.op && (typeof t.target.key === "string" ? t.target.key : JSON.stringify(t.target.key)) === item.key
          );
          if (idx !== -1) {
            transforms.splice(idx, 1);
            route.route.transforms = transforms;
          }
        }
      }
    }
    if (action === "add") {
      const tempFlags = {};
      await collectInteractiveHeaders(client, "response", tempFlags);
      const setHeaders = tempFlags["--set-response-header"] || [];
      for (const h of setHeaders) {
        const eqIdx = h.indexOf("=");
        if (eqIdx !== -1) {
          const key = h.slice(0, eqIdx).trim();
          const value = h.slice(eqIdx + 1);
          route.route.headers = {
            ...route.route.headers ?? {},
            [key]: value
          };
        }
      }
      const appendHeaders = tempFlags["--append-response-header"] || [];
      const deleteHeaders = tempFlags["--delete-response-header"] || [];
      const existing = route.route.transforms ?? [];
      const newTransforms = [];
      for (const h of appendHeaders) {
        const eqIdx = h.indexOf("=");
        if (eqIdx !== -1) {
          newTransforms.push({
            type: "response.headers",
            op: "append",
            target: { key: h.slice(0, eqIdx).trim() },
            args: h.slice(eqIdx + 1)
          });
        }
      }
      for (const key of deleteHeaders) {
        newTransforms.push({
          type: "response.headers",
          op: "delete",
          target: { key: key.trim() }
        });
      }
      if (newTransforms.length > 0) {
        route.route.transforms = [...existing, ...newTransforms];
      }
      break;
    }
  }
}
async function editTransformsByType(client, route, transformType, headerType) {
  const label = transformType === "request.headers" ? "Request Headers" : "Request Query";
  const itemName = transformType === "request.headers" ? "request header" : "query parameter";
  for (; ; ) {
    const allTransforms = route.route.transforms ?? [];
    const matching = allTransforms.filter((t) => t.type === transformType);
    if (matching.length > 0) {
      output_manager_default.print("\n");
      output_manager_default.print(`  ${import_chalk.default.cyan(`${label}:`)}
`);
      matching.forEach((t, i) => {
        output_manager_default.print(
          `    ${import_chalk.default.gray(`${i + 1}.`)} ${formatTransform(t)}
`
        );
      });
      output_manager_default.print("\n");
    } else {
      output_manager_default.print(`
  No ${label.toLowerCase()} set.

`);
    }
    const choices = [];
    if (matching.length > 0) {
      choices.push({ name: `Remove a ${itemName}`, value: "remove" });
    }
    choices.push({ name: `Add a ${itemName}`, value: "add" });
    choices.push({ name: "Back", value: "back" });
    const action = await client.input.select({
      message: `${label}:`,
      choices
    });
    if (action === "back")
      break;
    if (action === "remove") {
      const toRemove = await client.input.select({
        message: `Select ${itemName} to remove:`,
        choices: [
          ...matching.map((t, i) => ({
            name: formatTransform(t),
            value: i
          })),
          { name: "Cancel", value: -1 }
        ]
      });
      if (toRemove !== -1) {
        let matchIdx = 0;
        const removeIdx = allTransforms.findIndex((t) => {
          if (t.type === transformType) {
            if (matchIdx === toRemove)
              return true;
            matchIdx++;
          }
          return false;
        });
        if (removeIdx !== -1) {
          allTransforms.splice(removeIdx, 1);
          route.route.transforms = allTransforms;
        }
      }
    }
    if (action === "add") {
      const tempFlags = {};
      await collectInteractiveHeaders(client, headerType, tempFlags);
      const tfFlags = extractTransformFlags(tempFlags);
      const { transforms } = collectHeadersAndTransforms(tfFlags);
      if (transforms.length > 0) {
        route.route.transforms = [...allTransforms, ...transforms];
      }
      break;
    }
  }
}
async function edit(client, argv) {
  const parsed = await parseSubcommandArgs(argv, editSubcommand);
  if (typeof parsed === "number")
    return parsed;
  const link = await ensureProjectLink(client);
  if (typeof link === "number")
    return link;
  const { project, org } = link;
  const teamId = org.type === "team" ? org.id : void 0;
  const { args, flags } = parsed;
  const skipConfirmation = flags["--yes"];
  const identifier = args[0];
  const { RoutesEditTelemetryClient } = await import("./routes-MAKCAK4J.js");
  const telemetry = new RoutesEditTelemetryClient({
    opts: { store: client.telemetryEventStore }
  });
  telemetry.trackCliArgumentNameOrId(identifier);
  telemetry.trackCliFlagYes(skipConfirmation);
  telemetry.trackCliOptionName(flags["--name"]);
  telemetry.trackCliOptionDescription(
    flags["--description"]
  );
  telemetry.trackCliOptionSrc(flags["--src"]);
  telemetry.trackCliOptionSrcSyntax(
    flags["--src-syntax"]
  );
  telemetry.trackCliOptionAction(flags["--action"]);
  telemetry.trackCliOptionDest(flags["--dest"]);
  telemetry.trackCliOptionStatus(flags["--status"]);
  telemetry.trackCliFlagNoDest(flags["--no-dest"]);
  telemetry.trackCliFlagNoStatus(flags["--no-status"]);
  telemetry.trackCliFlagClearConditions(
    flags["--clear-conditions"]
  );
  telemetry.trackCliFlagClearHeaders(
    flags["--clear-headers"]
  );
  telemetry.trackCliFlagClearTransforms(
    flags["--clear-transforms"]
  );
  telemetry.trackCliOptionSetResponseHeader(
    flags["--set-response-header"]
  );
  telemetry.trackCliOptionAppendResponseHeader(
    flags["--append-response-header"]
  );
  telemetry.trackCliOptionDeleteResponseHeader(
    flags["--delete-response-header"]
  );
  telemetry.trackCliOptionSetRequestHeader(
    flags["--set-request-header"]
  );
  telemetry.trackCliOptionAppendRequestHeader(
    flags["--append-request-header"]
  );
  telemetry.trackCliOptionDeleteRequestHeader(
    flags["--delete-request-header"]
  );
  telemetry.trackCliOptionSetRequestQuery(
    flags["--set-request-query"]
  );
  telemetry.trackCliOptionAppendRequestQuery(
    flags["--append-request-query"]
  );
  telemetry.trackCliOptionDeleteRequestQuery(
    flags["--delete-request-query"]
  );
  telemetry.trackCliOptionHas(flags["--has"]);
  telemetry.trackCliOptionMissing(flags["--missing"]);
  if (!identifier) {
    output_manager_default.error(
      `Route name or ID is required. Usage: ${getCommandName("routes edit <name-or-id>")}`
    );
    return 1;
  }
  const { versions } = await getRouteVersions(client, project.id, { teamId });
  const existingStagingVersion = versions.find((v) => v.isStaging);
  output_manager_default.spinner("Fetching routes");
  const { routes } = await getRoutes(client, project.id, { teamId });
  output_manager_default.stopSpinner();
  if (routes.length === 0) {
    output_manager_default.error("No routes found in this project.");
    return 1;
  }
  const originalRoute = await resolveRoute(client, routes, identifier);
  if (!originalRoute) {
    output_manager_default.error(
      `No route found matching "${identifier}". Run ${import_chalk.default.cyan(
        getCommandName("routes list")
      )} to see all routes.`
    );
    return 1;
  }
  const route = cloneRoute(originalRoute);
  const hasEditFlags = flags["--name"] !== void 0 || flags["--description"] !== void 0 || flags["--src"] !== void 0 || flags["--src-syntax"] !== void 0 || flags["--action"] !== void 0 || flags["--dest"] !== void 0 || flags["--status"] !== void 0 || flags["--no-dest"] !== void 0 || flags["--no-status"] !== void 0 || flags["--has"] !== void 0 || flags["--missing"] !== void 0 || flags["--clear-conditions"] !== void 0 || flags["--clear-headers"] !== void 0 || flags["--clear-transforms"] !== void 0 || hasAnyTransformFlags(flags);
  if (hasEditFlags) {
    const error = applyFlagMutations(route, flags);
    if (error) {
      output_manager_default.error(error);
      return 1;
    }
  } else {
    if (!client.stdin.isTTY) {
      output_manager_default.error(
        `No edit flags provided. When running non-interactively, use flags like --name, --dest, --src, etc. Run ${getCommandName("routes edit --help")} for all options.`
      );
      return 1;
    }
    output_manager_default.log(`
Editing route "${originalRoute.name}"`);
    printRouteConfig(route);
    for (; ; ) {
      const hasConds = (route.route.has ?? []).length;
      const missingConds = (route.route.missing ?? []).length;
      const responseHeaders = getAllResponseHeaders(route).length;
      const requestHeaders = getTransformsByType(
        route,
        "request.headers"
      ).length;
      const requestQuery = getTransformsByType(route, "request.query").length;
      const syntaxLabel = route.srcSyntax === "path-to-regexp" ? "Pattern" : route.srcSyntax === "equals" ? "Exact" : "Regex";
      const descriptionPreview = route.description ? route.description.length > 40 ? route.description.slice(0, 40) + "..." : route.description : "";
      const editChoices = [
        { name: `Name (${route.name})`, value: "name" },
        {
          name: descriptionPreview ? `Description (${descriptionPreview})` : "Description",
          value: "description"
        },
        {
          name: `Source (${syntaxLabel}: ${route.route.src})`,
          value: "source"
        },
        {
          name: `Primary action (${getPrimaryActionLabel(route)})`,
          value: "action"
        },
        {
          name: `Conditions (${hasConds} has, ${missingConds} missing)`,
          value: "conditions"
        },
        {
          name: `Response Headers (${responseHeaders})`,
          value: "response-headers"
        },
        {
          name: `Request Headers (${requestHeaders})`,
          value: "request-headers"
        },
        {
          name: `Request Query (${requestQuery})`,
          value: "request-query"
        },
        { name: "Done - save changes", value: "done" }
      ];
      const choice = await client.input.select({
        message: "What would you like to edit?",
        choices: editChoices,
        pageSize: editChoices.length,
        loop: false
      });
      switch (choice) {
        case "name":
          await editName(client, route);
          break;
        case "description":
          await editDescription(client, route);
          break;
        case "source":
          await editSource(client, route);
          break;
        case "action":
          await editPrimaryAction(client, route);
          break;
        case "conditions":
          await editConditions(client, route);
          break;
        case "response-headers":
          await editResponseHeaders(client, route);
          break;
        case "request-headers":
          await editTransformsByType(
            client,
            route,
            "request.headers",
            "request-header"
          );
          break;
        case "request-query":
          await editTransformsByType(
            client,
            route,
            "request.query",
            "request-query"
          );
          break;
        case "done":
          break;
      }
      if (choice === "done") {
        const hasDest = !!route.route.dest;
        const hasStatus = !!route.route.status;
        const hasHeaders = Object.keys(route.route.headers ?? {}).length > 0;
        const hasTransforms = (route.route.transforms ?? []).length > 0;
        if (!hasDest && !hasStatus && !hasHeaders && !hasTransforms) {
          output_manager_default.warn(
            "Route has no action (no destination, status, or headers). Add an action before saving."
          );
          continue;
        }
        break;
      }
    }
  }
  populateRouteEnv(route.route);
  if (JSON.stringify(route) === JSON.stringify(originalRoute)) {
    output_manager_default.log("No changes made.");
    return 0;
  }
  const editStamp = stamp_default();
  output_manager_default.spinner(`Updating route "${route.name}"`);
  try {
    const { version } = await editRoute(
      client,
      project.id,
      originalRoute.id,
      {
        route: {
          name: route.name,
          description: route.description,
          enabled: route.enabled,
          srcSyntax: route.srcSyntax,
          route: route.route
        }
      },
      { teamId }
    );
    output_manager_default.log(
      `${import_chalk.default.cyan("Updated")} route "${route.name}" ${import_chalk.default.gray(editStamp())}`
    );
    await offerAutoPromote(
      client,
      project.id,
      version,
      !!existingStagingVersion,
      { teamId, skipPrompts: skipConfirmation }
    );
    return 0;
  } catch (e) {
    const error = e;
    output_manager_default.error(error.message || "Failed to update route");
    return 1;
  }
}
export {
  edit as default
};
