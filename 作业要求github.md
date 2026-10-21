Skip to content
 
Search Gists
Search...
All gists
Back to GitHub
@wsxiaoys
wsxiaoys/assignment.md Secret
Created 2 days ago • Report abuse
Code
Revisions
1
Forks
1
Clone this repository at &lt;script src=&quot;https://gist.github.com/wsxiaoys/849522ee389e0ce359ef444653084484.js&quot;&gt;&lt;/script&gt;
<script src="https://gist.github.com/wsxiaoys/849522ee389e0ce359ef444653084484.js"></script>
assignment.md
Assignment: Citation Grounding & Faithfulness Verifier
Objective
Build an HTTP service that accepts source context passages and an LLM-generated answer, decomposes the answer into atomic factual claims, verifies whether each claim is grounded in the source passages, and attaches verbatim citations.

Then, assemble an evaluation dataset and benchmark your verifier against a simpler baseline.

We are looking for how you design around structured LLM APIs, enforce deterministic validation on untrusted model outputs (e.g., verifying that cited quotes actually exist in the source), and build a thoughtful evaluation harness.

API Specification (POST /verify)
Your service should expose a POST /verify endpoint that accepts a JSON request body and returns a structured verification report.

Request Schema
{
  "context_passages": [
    "Beginning with version 3.7.0, Write-Ahead Log (WAL) mode is available. Advantages include significantly faster performance in most scenarios and increased concurrency: readers do not block writers and writers do not block readers. However, WAL does not work over a network filesystem because it requires all processes to share a small amount of memory via shared memory files (-shm).",
    "When in active use, the state of a WAL mode database is described by three separate files: the main database file 'X', the write-ahead log file 'X-wal', and the wal-index shared-memory file 'X-shm'. Automatic checkpointing occurs by default when the WAL passes approximately 1000 pages."
  ],
  "generated_answer": "SQLite WAL mode allows multiple processes across different host machines on an NFS network share to write concurrently. Alongside the main database file, it uses two auxiliary files (-wal and -shm) and automatically checkpoints when the log reaches roughly 1,000 pages. By default, WAL files are encrypted with AES-256 at rest."
}
Response Schema
{
  "claims": [
    {
      "claim_text": "SQLite WAL mode allows multiple processes across different host machines on an NFS network share to write concurrently.",
      "verdict": "CONTRADICTED",
      "reasoning": "The source explicitly states that WAL does not work over a network filesystem because all processes must share memory via -shm files.",
      "citations": [
        {
          "index": 0,
          "quote": "However, WAL does not work over a network filesystem because it requires all processes to share a small amount of memory via shared memory files (-shm)."
        }
      ]
    },
    {
      "claim_text": "Alongside the main database file, WAL mode uses two auxiliary files (-wal and -shm).",
      "verdict": "SUPPORTED",
      "reasoning": "The passage lists the main database file 'X', the write-ahead log file 'X-wal', and the shared-memory file 'X-shm'.",
      "citations": [
        {
          "index": 1,
          "quote": "When in active use, the state of a WAL mode database is described by three separate files: the main database file 'X', the write-ahead log file 'X-wal', and the wal-index shared-memory file 'X-shm'."
        }
      ]
    },
    {
      "claim_text": "SQLite WAL mode automatically checkpoints when the log reaches roughly 1,000 pages.",
      "verdict": "SUPPORTED",
      "reasoning": "The passage states that automatic checkpointing occurs by default at approximately 1000 pages.",
      "citations": [
        {
          "index": 1,
          "quote": "Automatic checkpointing occurs by default when the WAL passes approximately 1000 pages."
        }
      ]
    },
    {
      "claim_text": "By default, WAL files are encrypted with AES-256 at rest.",
      "verdict": "UNSUPPORTED",
      "reasoning": "Neither passage mentions encryption or AES-256.",
      "citations": []
    }
  ]
}
Field Definitions & Invariants
verdict: One of:
SUPPORTED: Fully entailed by one or more context passages.
CONTRADICTED: Directly refuted by one or more context passages.
UNSUPPORTED: Not mentioned or cannot be verified from the provided context alone (even if true in the real world).
citations:
Required (non-empty) for SUPPORTED and CONTRADICTED claims; empty ([]) for UNSUPPORTED claims.
index must be a valid 0-based index into context_passages.
quote must be an exact verbatim substring of context_passages[index] (you may also include start_char / end_char offsets).
reasoning: Brief explanation linking the cited evidence (or lack thereof) to the verdict.
Tasks
1. Build the Grounding Verifier Service
Implement the POST /verify HTTP server in TypeScript, Python, Go, or Rust.

Enforce the response schema and invariants in code (including programmatic checks that every index is in bounds and every quote is a verbatim substring of context_passages[index]).
Handle edge cases (empty context, answers with no factual claims, malformed model outputs, upstream API errors) gracefully.
2. Create an Evaluation Dataset
Assemble a labeled benchmark of at least 20 evaluation cases in JSON or JSONL format.

You may adapt cases from public faithfulness benchmarks (e.g., HaluEval, RAGTruth, FActScore) or author your own technical/systems QA examples.
Coverage: Include a balanced mix of:
Fully supported answers
Subtle distortions (off-by-one numbers, swapped conditions, inverted negations)
Extrinsic hallucinations (UNSUPPORTED facts that sound plausible or are even true outside the provided context)
Multi-passage synthesis (claims requiring evidence across more than one passage)
3. Benchmark & Compare Three Approaches
Write an evaluation script that runs your dataset across three implementations:

Simple Non-LLM Baseline: A deterministic or lightweight heuristic (e.g., sentence splitting + lexical overlap / TF-IDF / BM25 / local NLI).
LLM with Minimal Prompting: A straightforward single-call LLM setup with minimal prompt tuning.
Optimized LLM Verifier: Your best system (e.g., multi-step claim decomposition, refined prompting, programmatic quote verification/retries, etc.).
Include an evaluation report in your README.md comparing the three approaches across quality, latency/cost, and key failure cases.

What We Evaluate
Evaluation Rigor: How you design your benchmark dataset, define your evaluation metrics, and analyze failure modes.
Eval-Driven Hill Climbing: How you use evaluation results and failure cases to systematically iterate on prompts and system design from the minimal LLM baseline to your optimized verifier.
Engineering Quality: Clean types, sensible error boundaries, reproducible scripts, and concise documentation.
Submission
Share a public GitHub repository containing:

Code for the HTTP service and benchmark runner.
The 20+ case evaluation dataset (JSON or JSONL).
A README.md with instructions to run the service and benchmark, plus your evaluation report.
@Elorze
Comment
 

Leave a comment
Footer
© 2026 GitHub, Inc.
Footer navigation
Terms
Privacy
Security
Status
Community
Docs
Contact
Manage cookies
Do not share my personal information

