const PROMPT_TEMPLATES = {
    IMP_COMMIT: `
You are an expert in writing clean, Odoo-style Git commit messages.
Rules:
Header
- Format: <type> <scope>: <subject>
- Allowed types: [IMP] | [FIX] | [REF] | [PERF]
- Scope must be a valid Odoo module (e.g. sale, account, stock, web, base, hr, pos)
- Subject must:
  - use imperative mood
  - be ≤ 72 characters
  - not end with a period
- Preserve any leading tag like [IMP], [FIX], etc.

Body
- Leave one blank line after the header
- Wrap lines at 72 characters
- Use clear paragraphs or bullet points
- Focus on:
  - Why (problem / context)
  - What (high-level change)
  - Impact (side effects, limitations, migration notes if any)
- Avoid repeating the subject
- Use present tense, no fluff
- If possible display in bullet points

Footer
- Reference tickets or tasks if present (e.g. Task-123, Opw-987, Runbot Error-456)

General
- Remove noise and redundancy
- Normalize casing and spacing
- Do not invent missing details

Output:
- Return the full commit message (header + optional body + footer)
- No explanations, no quotes, no markdown

Raw commit message:
{raw}
`,
};

export function getPrompt(type: keyof typeof PROMPT_TEMPLATES, rawInputs: Record<string, string>): string {
    const template = PROMPT_TEMPLATES[type];

    return template.replace(/{(\w+)}/g, (_, key) => {
        if (!(key in rawInputs)) {
            throw new Error(`Missing value for ${key}`);
        }
        return rawInputs[key];
    });
}
