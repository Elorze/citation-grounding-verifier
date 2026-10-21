import { config } from 'dotenv';
config();
import { callWithValidation } from '../src/llm.js';

async function main() {
  const { claims, stats } = await callWithValidation({
    system: `You are a fact-checking assistant. Split the answer into atomic factual claims. For each claim, decide whether the context passages SUPPORT it, CONTRADICT it, or whether it is UNSUPPORTED (not stated in the passages). For SUPPORTED or CONTRADICTED claims, give the passage index and copy an exact quote from that passage. For UNSUPPORTED claims, citations must be an empty list. If the answer contains no factual claims, return an empty claims list.
Return only JSON in this format:
{"claims":[{"claim_text":"...","verdict":"SUPPORTED|CONTRADICTED|UNSUPPORTED","reasoning":"...","citations":[{"index":0,"quote":"..."}]}]}`,
    user: `Context passages:
[0] Hello world.

Answer:
Hello world is said.`,
    passages: ['Hello world.'],
    withValidation: true,
  });
  console.log(JSON.stringify({ claims, stats }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
