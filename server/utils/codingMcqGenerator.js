// High Quality MCQ Coding Question Generator & Fallback Bank for NEX AI
const vm = require('vm');
const { spawnSync } = require('child_process');
const util = require('util');

const FALLBACK_MCQS = {
  javascript: [
    {
      question: "What is the exact order of values logged by the JavaScript event loop when this code runs?",
      language: "javascript",
      codeSnippet: `console.log('start');

setTimeout(() => {
  console.log('timeout');
}, 0);

Promise.resolve()
  .then(() => {
    console.log('promise-1');
  })
  .then(() => {
    console.log('promise-2');
  });

console.log('end');`,
      options: [
        { id: "A", text: "start, end, promise-1, promise-2, timeout" },
        { id: "B", text: "start, timeout, promise-1, promise-2, end" },
        { id: "C", text: "start, end, timeout, promise-1, promise-2" },
        { id: "D", text: "start, promise-1, end, promise-2, timeout" }
      ],
      correctOption: "A",
      explanation: "Synchronous logs ('start', 'end') execute on the call stack first. Microtasks (Promise.then callbacks) drain completely before macrotasks (setTimeout)."
    },
    {
      question: "What does the following functional array pipeline log to the console?",
      language: "javascript",
      codeSnippet: `const items = [2, 5, 8, 11];
const result = items
  .filter((n, idx) => n % 2 === 0 || idx === 1)
  .reduce((acc, cur) => ({
    sum: acc.sum + cur,
    count: acc.count + 1
  }), { sum: 0, count: 0 });

console.log(\`\${result.count}:\${result.sum}\`);`,
      options: [
        { id: "A", text: "2:10" },
        { id: "B", text: "3:15" },
        { id: "C", text: "4:26" },
        { id: "D", text: "3:21" }
      ],
      correctOption: "B",
      explanation: "filter keeps 2 (even), 5 (idx === 1), and 8 (even). reduce sums 2 + 5 + 8 = 15 with count = 3, logging '3:15'."
    },
    {
      question: "What is logged when calling the closure functions created inside this loop?",
      language: "javascript",
      codeSnippet: `function buildCounters() {
  const fns = [];
  for (var i = 0; i < 3; i++) {
    fns.push((step) => i + step);
  }
  return fns;
}

const [fn0, fn1] = buildCounters();
console.log(fn0(1), fn1(2));`,
      options: [
        { id: "A", text: "1 3" },
        { id: "B", text: "3 4" },
        { id: "C", text: "4 5" },
        { id: "D", text: "0 2" }
      ],
      correctOption: "C",
      explanation: "Because 'var i' is function-scoped, all closures reference the same 'i' which ends at 3 after the loop. Thus fn0(1) is 3 + 1 = 4, and fn1(2) is 3 + 2 = 5."
    },
    {
      question: "What is the console output of the following nullish coalescing and optional chaining expression?",
      language: "javascript",
      codeSnippet: `const config = {
  retries: 0,
  timeout: null,
  nested: { enabled: false }
};

const r = config.retries ?? 3;
const t = config.timeout || 500;
const flag = config.nested?.missing ?? config.nested.enabled;

console.log(r, t, flag);`,
      options: [
        { id: "A", text: "3 500 true" },
        { id: "B", text: "0 500 false" },
        { id: "C", text: "0 null false" },
        { id: "D", text: "3 null true" }
      ],
      correctOption: "B",
      explanation: "Nullish coalescing (??) only falls back on null or undefined, so 0 is preserved for r. Logical OR (||) falls back on falsy null to 500. config.nested?.missing is undefined, falling back to false."
    }
  ],

  python: [
    {
      question: "What is the output of the following Python list slicing and generator expression?",
      language: "python",
      codeSnippet: `nums = [10, 20, 30, 40, 50]
sliced = nums[3:0:-1]
gen = (x // 10 for x in sliced if x > 20)

print(list(gen), len(sliced))`,
      options: [
        { id: "A", text: "[4, 3] 3" },
        { id: "B", text: "[4, 3, 2] 3" },
        { id: "C", text: "[4, 3] 4" },
        { id: "D", text: "[5, 4, 3] 3" }
      ],
      correctOption: "A",
      explanation: "nums[3:0:-1] takes indices 3, 2, 1 -> [40, 30, 20] (length 3). Filtering x > 20 keeps 40 and 30, yielding [4, 3]."
    },
    {
      question: "What does the following dictionary unpacking and comprehension output in Python?",
      language: "python",
      codeSnippet: `base = {'a': 1, 'b': 2, 'c': 3}
override = {k: v * 10 for k, v in base.items() if v % 2 == 1}
merged = {**base, **override, 'b': 99}

print(merged['a'], merged['b'], merged['c'])`,
      options: [
        { id: "A", text: "1 99 3" },
        { id: "B", text: "10 99 30" },
        { id: "C", text: "10 2 30" },
        { id: "D", text: "1 20 30" }
      ],
      correctOption: "B",
      explanation: "override scales odd values ('a': 10, 'c': 30). Unpacking overwrites 'a' and 'c' from override and sets 'b' to 99, printing 10 99 30."
    },
    {
      question: "What is the output of the two successive function calls in Python?",
      language: "python",
      codeSnippet: `def append_tag(tag, bucket=[]):
    bucket.append(tag)
    return len(bucket)

first = append_tag('alpha')
second = append_tag('beta', ['custom'])
third = append_tag('gamma')

print(first, second, third)`,
      options: [
        { id: "A", text: "1 2 2" },
        { id: "B", text: "1 1 2" },
        { id: "C", text: "1 2 3" },
        { id: "D", text: "1 1 1" }
      ],
      correctOption: "A",
      explanation: "first mutates the default list to ['alpha'] (len 1). second uses a new list ['custom', 'beta'] (len 2). third mutates the original default list to ['alpha', 'gamma'] (len 2)."
    }
  ],

  sql: [
    {
      question: "What is the exact output of the following SQL aggregation query with NULL values?",
      language: "sql",
      codeSnippet: `CREATE TABLE orders (id INT, amount INT);
INSERT INTO orders VALUES (1, 100), (2, 300), (3, NULL);

SELECT COUNT(*), COUNT(amount), AVG(COALESCE(amount, 200)) FROM orders;`,
      options: [
        { id: "A", text: "3, 2, 200" },
        { id: "B", text: "3, 3, 200" },
        { id: "C", text: "3, 2, 133.33" },
        { id: "D", text: "2, 2, 200" }
      ],
      correctOption: "A",
      explanation: "COUNT(*) counts all 3 rows. COUNT(amount) ignores NULLs (2). COALESCE replaces NULL with 200, so AVG is (100 + 300 + 200) / 3 = 200."
    },
    {
      question: "What does this LEFT JOIN with a condition in the ON clause return?",
      language: "sql",
      codeSnippet: `-- depts has 3 rows: (1, 'Eng'), (2, 'Sales'), (3, 'HR')
-- staff has 2 rows: (dept_id: 1, active: 1), (dept_id: 2, active: 0)

SELECT d.id, COALESCE(s.active, -1) AS flag
FROM depts d
LEFT JOIN staff s ON d.id = s.dept_id AND s.active = 1
ORDER BY d.id;`,
      options: [
        { id: "A", text: "3 rows: (1, 1), (2, -1), (3, -1)" },
        { id: "B", text: "1 row: (1, 1)" },
        { id: "C", text: "2 rows: (1, 1), (2, 0)" },
        { id: "D", text: "3 rows: (1, 1), (2, 0), (3, -1)" }
      ],
      correctOption: "A",
      explanation: "Because s.active = 1 is in the LEFT JOIN's ON clause (not WHERE), all 3 rows from depts are preserved, and unmatched rows (depts 2 and 3) get NULL -> -1."
    }
  ]
};

/**
 * Distinct, non-overlapping technical archetypes per mcqIndex so multiple MCQs never look similar
 */
const LANGUAGE_ARCHETYPES = {
  javascript: [
    {
      name: "Asynchronous Execution & Event Loop Ordering",
      instruction: "Test microtask queue (Promise.then / async-await) vs macrotask queue (setTimeout) and synchronous call stack execution order. DO NOT use object reference mutation or array shallow copy.",
      forbidden: "Do NOT use `const arr = [obj, obj]` or shallow object property mutation."
    },
    {
      name: "Functional Array Pipeline & Destructuring / Coalescing",
      instruction: "Test chained array transformations (`filter`, `map`, `reduce`, `find`) combined with destructuring defaults, nullish coalescing (`??`), or optional chaining (`?.`).",
      forbidden: "Do NOT use `setTimeout`, `Promise`, or `const arr = [obj, obj]` object reference sharing."
    },
    {
      name: "Closures, Lexical Scope & Higher-Order Functions",
      instruction: "Test lexical scoping, closure state retention across multiple calls (e.g., factory functions, currying, or `var` vs `let` block scoping in loops).",
      forbidden: "Do NOT repeat object reference arrays or simple event loop timers."
    },
    {
      name: "ES6 Map/Set Uniqueness, Spread/Rest & Type Coercion",
      instruction: "Test `Set` deduplication, `Map` key semantics, rest/spread parameter ordering, or short-circuit boolean evaluation (`&&`, `||`, `??`).",
      forbidden: "Do NOT repeat any earlier snippet structure."
    }
  ],
  python: [
    {
      name: "List/Dict Slicing, Negative Steps & Generator Expressions",
      instruction: "Test list slicing with step/negative indices (`[::-1]`, `[start:stop:step]`) combined with a list/generator comprehension and filtering.",
      forbidden: "Do NOT use mutable default arguments (`def fn(x, cache=[])`) in this question."
    },
    {
      name: "Dictionary Unpacking, Comprehensions & Set Operations",
      instruction: "Test dictionary comprehension, dictionary merging/unpacking (`{**d1, **d2}`), or tuple unpacking with `*rest`.",
      forbidden: "Do NOT use list slicing or mutable default arguments."
    },
    {
      name: "Closures, Late-Binding Lambdas or Decorator Execution",
      instruction: "Test lambda late-binding in loops (`[lambda x: x + i for i in range(3)]` vs default arg binding) or decorator wrapper order.",
      forbidden: "Do NOT repeat slicing or dictionary merging."
    },
    {
      name: "Exception Handling Flow (`try/except/else/finally`) & Scope",
      instruction: "Test execution order of `try`, `except`, `else`, and `finally` blocks when returning values or mutating state.",
      forbidden: "Do NOT repeat earlier snippets."
    }
  ],
  sql: [
    {
      name: "Aggregation Functions & NULL Semantics (`COUNT`, `AVG`, `COALESCE`, `HAVING`)",
      instruction: "Test the difference between `COUNT(*)`, `COUNT(col)`, `AVG(col)`, and `COALESCE` when `NULL` rows are present with `GROUP BY` / `HAVING`.",
      forbidden: "Do NOT use JOINs in this question."
    },
    {
      name: "LEFT JOIN vs INNER JOIN & Filtering in `ON` vs `WHERE`",
      instruction: "Test how placing a filter condition in the `LEFT JOIN ... ON` clause differs from placing it in the `WHERE` clause when unmatched NULL rows exist.",
      forbidden: "Do NOT repeat simple single-table COUNT/AVG queries."
    },
    {
      name: "Window Functions (`ROW_NUMBER`, `RANK`, `DENSE_RANK`, `PARTITION BY`)",
      instruction: "Test how `RANK()`, `DENSE_RANK()`, and `ROW_NUMBER()` assign numbers when ties exist within a `PARTITION BY` group.",
      forbidden: "Do NOT repeat basic COUNT(*) or simple LEFT JOIN queries."
    }
  ]
};

/**
 * Determine best language based on candidate's target role and benchmark skills
 */
function detectRoleLanguage(role = '', skills = []) {
  const combined = `${role} ${Array.isArray(skills) ? skills.join(' ') : ''}`.toLowerCase();

  if (combined.includes('python') || combined.includes('data') || combined.includes('machine learning') || combined.includes('ai') || combined.includes('ml')) {
    return 'python';
  }
  if (combined.includes('sql') || combined.includes('database') || combined.includes('dba') || combined.includes('analytics')) {
    return 'sql';
  }
  return 'javascript';
}

/**
 * Build Gemini prompt to generate a tailored, guaranteed-distinct MCQ coding question
 */
function buildCodingMcqPrompt({ role, skills, mcqIndex = 1, mode = 'hiring', previousMcqs = [] }) {
  const lang = detectRoleLanguage(role, skills);
  const archetypes = LANGUAGE_ARCHETYPES[lang] || LANGUAGE_ARCHETYPES.javascript;
  const archetype = archetypes[(mcqIndex - 1) % archetypes.length];

  const skillArray = Array.isArray(skills) && skills.length > 0 ? skills : ['Core Programming', 'Problem Solving'];
  const focusedSkill = skillArray[(mcqIndex - 1) % skillArray.length];
  const secondarySkill = skillArray[mcqIndex % skillArray.length];

  const targetCorrectLetters = ['B', 'C', 'A', 'D'];
  const preferredCorrectOption = targetCorrectLetters[(mcqIndex - 1) % targetCorrectLetters.length];

  const previousBlock =
    Array.isArray(previousMcqs) && previousMcqs.length > 0
      ? `\nPREVIOUSLY GENERATED MCQS IN THIS SESSION (STRICTLY DO NOT REPEAT OR RESEMBLE THESE):\n${previousMcqs
          .map((m, i) => `MCQ #${i + 1} (${m.topic || 'prior'}): ${m.question}\nCode:\n${m.codeSnippet}`)
          .join('\n---\n')}\n`
      : '';

  return `
You are a senior technical interviewer creating Coding Multiple Choice Question (MCQ) #${mcqIndex}.
Role: ${role || 'Software Engineer'}
Primary Target Skill for this Question: ${focusedSkill} (Secondary context: ${secondarySkill})
Target Programming Language: ${lang.toUpperCase()}
Mode: ${mode.toUpperCase()}

MANDATORY TECHNICAL ARCHETYPE FOR MCQ #${mcqIndex}:
- Category: "${archetype.name}"
- Requirement: ${archetype.instruction}
- Restriction: ${archetype.forbidden}
${previousBlock}
CRITICAL COMPETENCY & UNIQUENESS CONSTRAINTS:
1. Base this question strictly on "${focusedSkill}" in ${lang.toUpperCase()} using the "${archetype.name}" archetype above.
2. Do NOT refer to or follow up on any candidate conversation history.
3. Make the code snippet realistic, self-contained (6 to 14 lines), using ONLY built-in standard library constructs (no external third-party imports), and completely distinct from any previous MCQ.
4. Trace the code execution step-by-step to compute the EXACT stdout output.
5. Provide 4 STRICTLY UNIQUE options (A, B, C, D) — no two options may have the same text! Place the exact true output in Option "${preferredCorrectOption}" and 3 distinct, plausible distractor outputs in the other options.

CRITICAL FORMAT INSTRUCTION:
Return ONLY a valid, parseable JSON object without backticks, without code blocks, without markdown:
{
  "type": "mcq",
  "language": "${lang}",
  "question": "What is the exact output of the following ${lang.toUpperCase()} code snippet?",
  "codeSnippet": "<valid code snippet with newlines>",
  "options": [
    { "id": "A", "text": "<unique option A text>" },
    { "id": "B", "text": "<unique option B text>" },
    { "id": "C", "text": "<unique option C text>" },
    { "id": "D", "text": "<unique option D text>" }
  ],
  "correctOption": "${preferredCorrectOption}",
  "explanation": "<brief explanation of why Option ${preferredCorrectOption} is produced>"
}`;
}

/**
 * Normalizes code output strings so minor formatting differences (quote style, spacing, CRLF)
 * never cause a false mismatch.
 */
function normalizeOutput(str) {
  return String(str ?? '')
    .trim()
    .replace(/\r\n/g, '\n')
    .replace(/\s+/g, ' ');
}

function canonicalizeOutput(str) {
  return normalizeOutput(str)
    .replace(/"/g, "'")
    .replace(/\s*,\s*/g, ', ')
    .replace(/\s*:\s*/g, ': ')
    .replace(/\[\s+/g, '[')
    .replace(/\s+\]/g, ']')
    .replace(/\{\s+/g, '{')
    .replace(/\s+\}/g, '}')
    .replace(/\(\s+/g, '(')
    .replace(/\s+\)/g, ')')
    .toLowerCase();
}

function outputsMatch(a, b) {
  if (a === undefined || a === null || b === undefined || b === null) return false;
  const normA = normalizeOutput(a);
  const normB = normalizeOutput(b);
  if (!normA || !normB) return false;
  if (normA === normB) return true;
  return canonicalizeOutput(normA) === canonicalizeOutput(normB);
}

/**
 * Safely executes a self-contained JavaScript or Python MCQ snippet to determine
 * the 100% ground-truth stdout output. Returns null if the snippet cannot be executed.
 */
function executeCodeSnippet(codeSnippet, language = 'javascript') {
  if (!codeSnippet || typeof codeSnippet !== 'string') return null;
  const lang = String(language || 'javascript').toLowerCase().trim();

  if (lang === 'javascript' || lang === 'js' || lang === 'typescript' || lang === 'ts') {
    // Only run synchronous snippets directly; skip if setTimeout is used since vm.runInNewContext won't drain timers
    if (/\b(setTimeout|setInterval|fetch|require|process|fs)\b/.test(codeSnippet)) {
      return null;
    }
    try {
      const logs = [];
      const formatArg = (val) => {
        if (typeof val === 'string') return val;
        if (typeof val === 'number' || typeof val === 'boolean' || val === null || val === undefined) {
          return String(val);
        }
        return util.inspect(val, { depth: 4, compact: true, breakLength: Infinity });
      };
      const sandbox = {
        console: {
          log: (...args) => logs.push(args.map(formatArg).join(' '))
        }
      };
      vm.runInNewContext(codeSnippet, sandbox, { timeout: 400 });
      const out = logs.join('\n').trim();
      return out.length > 0 ? out : null;
    } catch {
      return null;
    }
  }

  if (lang === 'python' || lang === 'py') {
    // Block any file/network/process operations
    if (/\b(os\.|subprocess|sys\.|open\s*\(|shutil|socket|urllib|requests|input\s*\()\b/.test(codeSnippet)) {
      return null;
    }
    try {
      const res = spawnSync('python', ['-I', '-c', codeSnippet], {
        timeout: 1800,
        encoding: 'utf8',
        windowsHide: true
      });
      if (res.status === 0 && typeof res.stdout === 'string') {
        const out = res.stdout.trim().replace(/\r\n/g, '\n');
        return out.length > 0 ? out : null;
      }
    } catch {
      return null;
    }
  }

  return null;
}

/**
 * Verifies an AI-generated MCQ against actual code execution and sanitizes options:
 * 1. Ensures 4 valid options (A, B, C, D).
 * 2. Executes the snippet to get the true stdout; if found, aligns `correctOption` with the matching option
 *    (or injects the true output into `correctOption` if the LLM miscalculated all 4 options).
 * 3. Deduplicates options so no two options ever share the same text.
 */
function verifyAndNormalizeMcq(mcqData) {
  if (!mcqData || typeof mcqData !== 'object') return mcqData;

  const validIds = ['A', 'B', 'C', 'D'];
  const rawOptions = Array.isArray(mcqData.options) ? mcqData.options : [];
  const options = validIds.map((id, idx) => {
    const existing = rawOptions.find((o) => String(o?.id || '').toUpperCase() === id) || rawOptions[idx] || {};
    return {
      id,
      text: String(existing.text ?? `Option ${id}`).trim()
    };
  });

  let declaredCorrect = String(mcqData.correctOption || 'A').trim().toUpperCase();
  const letterMatch = declaredCorrect.match(/\b([ABCD])\b/);
  declaredCorrect = letterMatch ? letterMatch[1] : 'A';

  // Execute code snippet to verify ground-truth output
  const actualOutput = executeCodeSnippet(mcqData.codeSnippet, mcqData.language);
  if (actualOutput) {
    const matchingOpt = options.find((opt) => outputsMatch(opt.text, actualOutput));
    if (matchingOpt) {
      declaredCorrect = matchingOpt.id;
    } else {
      // LLM miscalculated the output across all 4 options -> put the real output into declaredCorrect slot
      const targetOpt = options.find((opt) => opt.id === declaredCorrect) || options[0];
      targetOpt.text = actualOutput;
      declaredCorrect = targetOpt.id;
    }
  }

  // Deduplicate option texts: ensure the correct option's text is never duplicated in another option,
  // and no two distractors share identical text.
  const correctOptObj = options.find((o) => o.id === declaredCorrect) || options[0];
  const seenCanonical = new Set([canonicalizeOutput(correctOptObj.text)]);

  for (const opt of options) {
    if (opt.id === declaredCorrect) continue;
    let key = canonicalizeOutput(opt.text);
    if (seenCanonical.has(key)) {
      // Mutate duplicate distractor so it is visually and semantically distinct
      const baseText = opt.text.trim();
      if (/^\[.*\]$/.test(baseText)) {
        opt.text = baseText === '[]' ? '[None]' : '[]';
      } else if (/^\{.*\}$/.test(baseText)) {
        opt.text = baseText === '{}' ? "{'result': None}" : '{}';
      } else if (/^-?\d+(\.\d+)?$/.test(baseText)) {
        opt.text = String(Number(baseText) + 1);
      } else {
        opt.text = `${baseText} (Error / Undefined)`;
      }
      key = canonicalizeOutput(opt.text);
      if (seenCanonical.has(key)) {
        opt.text = `None (Option ${opt.id})`;
        key = canonicalizeOutput(opt.text);
      }
    }
    seenCanonical.add(key);
  }

  return {
    ...mcqData,
    options,
    correctOption: declaredCorrect
  };
}

/**
 * Grades an answered MCQ turn from an assessment transcript accurately:
 * - Extracts both the user's selected option ID (A/B/C/D) and the selected option text.
 * - Verifies ground-truth code output via `executeCodeSnippet`.
 * - Marks the answer CORRECT if:
 *   1. User's option ID matches the verified or declared `correctOption`, OR
 *   2. User's selected option text matches the text of the verified or declared `correctOption` (handles duplicate options), OR
 *   3. User's selected option text matches the actual executed stdout of `codeSnippet` (handles LLM miscalculation of `correctOption`).
 */
function evaluateMcqTurn(turn, idx = 0) {
  const rawAnswer = String(turn?.answer || '').trim();
  const options = Array.isArray(turn?.options) ? turn.options : [];

  // Extract option letter from "Option B: ..." or leading "B"
  const optMatch = rawAnswer.match(/^Option\s+([A-D])\s*:\s*(.*)$/i) || rawAnswer.match(/^([A-D])\b[:\s-]*(.*)$/i);
  const userOptionId = optMatch ? optMatch[1].toUpperCase() : '';
  const parsedAnswerText = optMatch ? optMatch[2].trim() : rawAnswer;

  const userOptionObj = options.find((o) => String(o?.id || '').toUpperCase() === userOptionId);
  const userText = userOptionObj?.text || parsedAnswerText;

  // Declared correct option from stored transcript
  const rawExpected = String(turn?.correctOption || 'A').trim().toUpperCase();
  const expMatch = rawExpected.match(/\b([A-D])\b/);
  const declaredCorrectId = expMatch ? expMatch[1] : 'A';
  const declaredCorrectObj = options.find((o) => String(o?.id || '').toUpperCase() === declaredCorrectId);
  const declaredCorrectText = declaredCorrectObj?.text ?? '';

  // Ground-truth code execution check
  const actualOutput = executeCodeSnippet(turn?.codeSnippet, turn?.language);
  let verifiedCorrectId = declaredCorrectId;
  let verifiedCorrectText = declaredCorrectText;

  if (actualOutput) {
    const trueOpt = options.find((o) => outputsMatch(o?.text, actualOutput));
    if (trueOpt) {
      verifiedCorrectId = String(trueOpt.id).toUpperCase();
      verifiedCorrectText = trueOpt.text;
    } else {
      verifiedCorrectText = actualOutput;
    }
  }

  let isCorrect = false;
  if (rawAnswer) {
    // 1. Option ID matches verified or declared correct option
    if (userOptionId && (userOptionId === verifiedCorrectId || userOptionId === declaredCorrectId)) {
      // If we have ground-truth execution and a matching option exists, prefer the ground-truth option
      if (actualOutput && options.some((o) => outputsMatch(o?.text, actualOutput))) {
        isCorrect = userOptionId === verifiedCorrectId || outputsMatch(userText, verifiedCorrectText);
      } else {
        isCorrect = true;
      }
    }
    // 2. Selected option text matches verified or declared correct option text (handles duplicate options like B & C having same text)
    if (!isCorrect && userText) {
      if (verifiedCorrectText && outputsMatch(userText, verifiedCorrectText)) {
        isCorrect = true;
      } else if (!actualOutput && declaredCorrectText && outputsMatch(userText, declaredCorrectText)) {
        isCorrect = true;
      }
    }
    // 3. Selected option text matches actual runtime output of the snippet directly
    if (!isCorrect && actualOutput && userText && outputsMatch(userText, actualOutput)) {
      isCorrect = true;
    }
  }

  return {
    number: idx + 1,
    topic: turn?.topic || `coding_mcq_${idx + 1}`,
    language: turn?.language || 'code',
    question: turn?.question || 'Coding Output MCQ',
    selectedOption: userOptionId || null,
    userAnswer: rawAnswer || 'No answer submitted',
    userAnswerText: userText || rawAnswer,
    correctOption: verifiedCorrectId,
    correctAnswerText: verifiedCorrectText || declaredCorrectText,
    isCorrect
  };
}

/**
 * Checks whether two MCQ code snippets are too similar so we never serve duplicate/similar MCQs
 */
function areMcqsTooSimilar(mcqA, mcqB) {
  if (!mcqA || !mcqB) return false;
  const norm = (s) => String(s || '').toLowerCase().replace(/\s+/g, ' ').trim();
  const codeA = norm(mcqA.codeSnippet);
  const codeB = norm(mcqB.codeSnippet);
  if (!codeA || !codeB) return false;
  if (codeA === codeB) return true;

  // Check token overlap (Jaccard similarity on identifiers/keywords)
  const tokensA = new Set(codeA.split(/[^a-z0-9_]+/).filter((t) => t.length > 2));
  const tokensB = new Set(codeB.split(/[^a-z0-9_]+/).filter((t) => t.length > 2));
  if (tokensA.size === 0 || tokensB.size === 0) return false;

  let intersection = 0;
  for (const t of tokensA) {
    if (tokensB.has(t)) intersection++;
  }
  const union = new Set([...tokensA, ...tokensB]).size;
  return union > 0 && intersection / union > 0.65;
}

/**
 * Get fallback MCQ question guaranteed to be distinct per mcqIndex
 */
function getFallbackCodingMcq(role = '', skills = [], mcqIndex = 1, existingMcqs = []) {
  const lang = detectRoleLanguage(role, skills);
  const pool = FALLBACK_MCQS[lang] || FALLBACK_MCQS.javascript;
  for (let offset = 0; offset < pool.length; offset++) {
    const candidate = pool[(mcqIndex - 1 + offset) % pool.length];
    const collides = (existingMcqs || []).some((prev) => areMcqsTooSimilar(candidate, prev));
    if (!collides) {
      return { type: 'mcq', ...candidate };
    }
  }
  return {
    type: 'mcq',
    ...pool[(mcqIndex - 1) % pool.length]
  };
}

module.exports = {
  detectRoleLanguage,
  buildCodingMcqPrompt,
  getFallbackCodingMcq,
  areMcqsTooSimilar,
  verifyAndNormalizeMcq,
  evaluateMcqTurn,
  executeCodeSnippet,
  FALLBACK_MCQS
};
