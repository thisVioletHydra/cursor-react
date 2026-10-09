// Programmatic ESLint (flat config) with eslint-plugin-react-hooks recommended (incl. React Compiler rules).
import os from 'node:os';
import path from 'node:path';
import { ESLint } from 'eslint';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';

const recommended = reactHooks.configs.flat?.['recommended-latest'] ?? reactHooks.configs['recommended-latest'] ?? reactHooks.configs.recommended;

const rules = { ...recommended.rules, 'no-nested-ternary': 'error', 'no-unneeded-ternary': 'warn' };

let eslint;
function getEslint() {
  eslint ??= new ESLint({
    cwd: os.tmpdir(),
    overrideConfigFile: true,
    overrideConfig: [
      {
        files: ['**/*.{js,jsx,ts,tsx,mjs,cjs}'],
        languageOptions: {
          parser: tseslint.parser,
          ecmaVersion: 'latest',
          sourceType: 'module',
          parserOptions: { ecmaFeatures: { jsx: true } },
        },
        plugins: { 'react-hooks': reactHooks },
        rules,
      },
    ],
  });
  return eslint;
}

export async function lintComponent(code, filename = 'Component.tsx') {
  const [res] = await getEslint().lintText(code, { filePath: filename });
  return res.messages.map((m) => ({
    rule: m.ruleId ?? (m.fatal ? 'parse-error' : null),
    severity: m.severity === 2 ? 'error' : 'warning',
    line: m.line, column: m.column,
    message: m.message.split(path.join(os.tmpdir(), filename)).join(filename),
  }));
}

export const lintRules = Object.keys(rules);
