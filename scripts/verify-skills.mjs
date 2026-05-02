#!/usr/bin/env node
// Skill-lint for the bundled extensions/ tree.
//
// Per the v1.1.0 plan, this enforces all Wave-2 silent-fail traps:
//   - SKILL.md exists with the EXACT uppercase filename
//   - `name:` frontmatter equals the parent directory name (case-sensitive)
//   - YAML-safe descriptions (any colon must be quoted)
//   - Non-empty description containing at least one GA4 trigger keyword
//   - Every references/*.md link in the body resolves to a real file
//   - Every scripts/*.{sh,py} referenced in the body exists with a shebang
//   - SKILL.md uses LF line endings (no CRLF, no UTF-8 BOM)
//
// Wired into `pnpm verify`. Exits non-zero with a list of broken skills.

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const extDir = join(repoRoot, 'extensions');

const TRIGGER_KEYWORDS = [
  'GA4',
  'Google Analytics',
  'analytics',
  'traffic',
  'sessions',
  'users',
  'conversion',
  'property',
  'dimension',
  'metric',
  'audience',
  'funnel',
  'cohort',
  'real-time',
  'key event',
  'gacli',
];

const errors = [];
const warnings = [];

function err(msg) {
  errors.push(msg);
}
function warn(msg) {
  warnings.push(msg);
}

function isExtensionsDir(dir) {
  return existsSync(dir) && statSync(dir).isDirectory();
}

if (!isExtensionsDir(extDir)) {
  console.error(`No extensions/ tree at ${extDir}`);
  process.exit(2);
}

// 1. _core/ exists with all 7 expected files.
const coreDir = join(extDir, '_core');
const expectedCore = [
  'auth-setup.md',
  'command-catalog.md',
  'decision-tree.md',
  'dimensions-metrics.md',
  'filter-grammar.md',
  'pitfalls.md',
  'recipes.md',
];
if (!isExtensionsDir(coreDir)) {
  err(`_core/ directory missing at ${coreDir}`);
} else {
  for (const f of expectedCore) {
    if (!existsSync(join(coreDir, f))) {
      err(`_core/${f} missing`);
    }
  }
}

// 2. Each per-CLI package: scan extensions/<cli>/skills/*/SKILL.md.
const cliDirs = ['claude-code', 'codex', 'qwen', 'gemini'];
for (const cliDir of cliDirs) {
  const pkgDir = join(extDir, cliDir);
  if (!isExtensionsDir(pkgDir)) {
    err(`Per-CLI package directory missing: extensions/${cliDir}/`);
    continue;
  }
  const skillsDir = join(pkgDir, 'skills');
  if (!isExtensionsDir(skillsDir)) {
    err(`Per-CLI skills/ missing: extensions/${cliDir}/skills/`);
    continue;
  }
  if (!existsSync(join(pkgDir, 'INSTALL.md'))) {
    warn(`extensions/${cliDir}/INSTALL.md missing (recommended for users)`);
  }
  for (const skillName of readdirSync(skillsDir)) {
    const skillDir = join(skillsDir, skillName);
    if (!statSync(skillDir).isDirectory()) continue;
    lintSkill({ cliDir, skillName, skillDir });
  }
}

if (warnings.length) {
  console.error(`\nWarnings (${warnings.length}):`);
  for (const w of warnings) console.error(`  - ${w}`);
}

if (errors.length) {
  console.error(`\nSkill-lint failed (${errors.length} error${errors.length === 1 ? '' : 's'}):`);
  for (const e of errors) console.error(`  ✖ ${e}`);
  process.exit(1);
}

console.log(`✔ Skill-lint passed (${cliDirs.length} packages, _core/ + supporting files OK).`);

/**
 * Parse top-level fields from a YAML frontmatter block (between the `---`
 * delimiters but not including them). Returns a record `{ fieldName: {
 * firstLine: string, body: string } }`. `firstLine` is everything after the
 * colon on the field's first line; `body` is the joined indented continuation
 * lines (block scalars, list items, etc.) up to the next top-level field.
 */
function parseTopLevelFields(yaml) {
  const lines = yaml.split('\n');
  const result = {};
  let current = null;
  for (const line of lines) {
    const headerMatch = line.match(/^([A-Za-z][A-Za-z0-9_-]*):(.*)$/);
    if (headerMatch) {
      current = headerMatch[1];
      result[current] = { firstLine: headerMatch[2], body: '' };
    } else if (current) {
      result[current].body += (result[current].body ? '\n' : '') + line;
    }
  }
  return result;
}

function stripQuotes(s) {
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    return s.slice(1, -1);
  }
  return s;
}

// ---------------------------------------------------------------------------

function lintSkill({ cliDir, skillName, skillDir }) {
  const skillRel = relative(repoRoot, skillDir);

  // Trap 1: SKILL.md must exist with EXACT uppercase filename.
  const exactFiles = readdirSync(skillDir);
  if (!exactFiles.includes('SKILL.md')) {
    const lowerMatch = exactFiles.find((f) => f.toLowerCase() === 'skill.md');
    if (lowerMatch) {
      err(`${skillRel}/${lowerMatch}: filename must be exactly 'SKILL.md' (case-sensitive — strict CLIs reject otherwise)`);
    } else {
      err(`${skillRel}/SKILL.md missing`);
    }
    return;
  }
  const skillFile = join(skillDir, 'SKILL.md');
  const raw = readFileSync(skillFile);

  // Trap 2: no UTF-8 BOM, no CRLF.
  if (raw.length >= 3 && raw[0] === 0xef && raw[1] === 0xbb && raw[2] === 0xbf) {
    err(`${skillRel}/SKILL.md has a UTF-8 BOM — strip it (Qwen #2053 silent-fail)`);
  }
  if (raw.includes(0x0d)) {
    err(`${skillRel}/SKILL.md has CRLF line endings — convert to LF`);
  }
  const text = raw.toString('utf-8');

  // Trap 3: frontmatter starts on line 1 with `---`.
  if (!text.startsWith('---\n')) {
    err(`${skillRel}/SKILL.md must start with '---' on line 1 (frontmatter delimiter)`);
    return;
  }
  const fmEnd = text.indexOf('\n---', 4);
  if (fmEnd === -1) {
    err(`${skillRel}/SKILL.md frontmatter has no closing '---'`);
    return;
  }
  const frontmatter = text.slice(4, fmEnd);
  const body = text.slice(fmEnd + 4);

  const fields = parseTopLevelFields(frontmatter);

  // Trap 4: name: field equals directory name exactly.
  if (fields.name == null) {
    err(`${skillRel}/SKILL.md missing 'name:' frontmatter field`);
  } else {
    const declared = stripQuotes(fields.name.firstLine.trim());
    if (declared !== skillName) {
      err(
        `${skillRel}/SKILL.md: 'name: ${declared}' must equal directory name '${skillName}' exactly (case-sensitive — silent-fail in strict CLIs)`,
      );
    }
  }

  // Trap 5: description present + GA4-trigger-keyword density + YAML-safe.
  if (fields.description == null) {
    err(`${skillRel}/SKILL.md missing 'description:' field`);
  } else {
    const { firstLine, body } = fields.description;
    const fullText = (firstLine + '\n' + body).trim();
    if (!fullText) {
      err(`${skillRel}/SKILL.md description is empty`);
    } else {
      // YAML-safety check: a plain unquoted scalar with `: ` inside breaks the
      // YAML parser. `|`/`>` block scalars and quoted strings are safe.
      const trimmedFirst = firstLine.trim();
      const isBlockScalar = trimmedFirst.startsWith('|') || trimmedFirst.startsWith('>');
      const isQuoted = trimmedFirst.startsWith('"') || trimmedFirst.startsWith("'");
      if (!isBlockScalar && !isQuoted && /:\s/.test(trimmedFirst)) {
        err(
          `${skillRel}/SKILL.md description contains an unquoted ':' — wrap in quotes or use '|' block scalar to avoid YAML parse failure`,
        );
      }
      const haystack = fullText.toLowerCase();
      const hasTrigger = TRIGGER_KEYWORDS.some((kw) => haystack.includes(kw.toLowerCase()));
      if (!hasTrigger) {
        err(
          `${skillRel}/SKILL.md description has no GA4 trigger keyword (one of: ${TRIGGER_KEYWORDS.join(', ')})`,
        );
      }
    }
  }

  // Trap 6: every references/*.md link in the body resolves to a real file.
  const refLinkRe = /\(references\/([\w.-]+\.md)\)/g;
  let m;
  const referencedRefs = new Set();
  while ((m = refLinkRe.exec(body)) !== null) {
    referencedRefs.add(m[1]);
  }
  for (const ref of referencedRefs) {
    // The references/ subdir is filled at install time from _core/, so we
    // accept any file that exists in _core/.
    if (!existsSync(join(coreDir, ref))) {
      err(
        `${skillRel}/SKILL.md references 'references/${ref}' but no matching file in _core/`,
      );
    }
  }

  // Trap 7: every scripts/*.{sh,py} referenced in body exists + has a shebang.
  const scriptRefRe = /(?:bash|sh|python3?|exec)\s+(?:\.\/)?scripts\/([\w.-]+\.(?:sh|py))/g;
  const scriptsDir = join(skillDir, 'scripts');
  while ((m = scriptRefRe.exec(body)) !== null) {
    const scriptName = m[1];
    const scriptPath = join(scriptsDir, scriptName);
    if (!existsSync(scriptPath)) {
      err(`${skillRel}/SKILL.md references 'scripts/${scriptName}' but file missing`);
      continue;
    }
    const head = readFileSync(scriptPath, 'utf-8').slice(0, 200);
    if (!head.startsWith('#!')) {
      err(`${skillRel}/scripts/${scriptName}: missing shebang on line 1`);
    }
  }

  // 8. Codex-specific: validate agents/openai.yaml shape if present.
  if (cliDir === 'codex') {
    const agentsYaml = join(skillDir, 'agents', 'openai.yaml');
    if (!existsSync(agentsYaml)) {
      warn(`${skillRel}/agents/openai.yaml missing (recommended for Codex skills)`);
    } else {
      const yamlText = readFileSync(agentsYaml, 'utf-8');
      for (const required of ['interface:', 'policy:', 'dependencies:']) {
        if (!yamlText.includes(required)) {
          err(`${skillRel}/agents/openai.yaml missing top-level '${required}'`);
        }
      }
    }
  }
}
