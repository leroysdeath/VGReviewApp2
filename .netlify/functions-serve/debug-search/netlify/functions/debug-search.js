var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// netlify/functions/debug-search.js
var debug_search_exports = {};
__export(debug_search_exports, {
  handler: () => handler
});
module.exports = __toCommonJS(debug_search_exports);
var handler = async (event, context) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Content-Type": "application/json"
  };
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }
  const debugInfo = {
    httpMethod: event.httpMethod,
    path: event.path,
    queryStringParameters: event.queryStringParameters,
    headers: event.headers,
    body: event.body,
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  };
  console.log("Debug - Request received:", JSON.stringify(debugInfo, null, 2));
  let possibleQueries = {};
  if (event.queryStringParameters) {
    Object.keys(event.queryStringParameters).forEach((key) => {
      possibleQueries[key] = event.queryStringParameters[key];
    });
  }
  if (event.body) {
    try {
      const bodyData = JSON.parse(event.body);
      Object.keys(bodyData).forEach((key) => {
        possibleQueries[`body.${key}`] = bodyData[key];
      });
    } catch (e) {
      possibleQueries["body_raw"] = event.body;
    }
  }
  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      message: "Debug information collected",
      debugInfo,
      possibleQueries,
      recommendation: Object.keys(possibleQueries).length === 0 ? "No query parameters found - check your frontend implementation" : `Found parameters: ${Object.keys(possibleQueries).join(", ")}`
    }, null, 2)
  };
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  handler
});
//# sourceMappingURL=debug-search.js.map
