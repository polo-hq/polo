import { polo } from "./polo.ts";
import { buildPrompt, buildSystemPrompt, summarizeTrace, supportReply } from "./supportReply.ts";

const input = {
  accountId: "acc_123",
  transcript:
    "Our webhook deliveries have been timing out in production since yesterday's deploy. Can you help us figure out the safest next step?",
};

const { context, trace } = await polo.resolve(supportReply, input);

console.log("=== Context Keys ===");
console.log(Object.keys(context));

console.log("\n=== System Prompt ===");
console.log(buildSystemPrompt(context));

console.log("\n=== User Prompt ===");
console.log(buildPrompt(context));

console.log("\n=== Trace Summary ===");
console.log(summarizeTrace(trace));

console.log("\n=== Full Trace JSON ===");
console.log(JSON.stringify(trace, null, 2));
