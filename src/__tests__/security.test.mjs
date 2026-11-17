// Plain JavaScript on purpose: it reads project files from disk, and the app's TypeScript config has no Node typings.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const SKIP = new Set(['node_modules', 'dist', '.git']);

/** Every text file in the project that could end up in the repository or the browser bundle. */
function projectFiles(dir = root) {
  return readdirSync(dir).flatMap((name) => {
    if (SKIP.has(name) || name === '.env' || name === 'package-lock.json') return []; // .env is git-ignored
    const path = join(dir, name);
    return statSync(path).isDirectory() ? projectFiles(path) : [path];
  });
}

// Shapes of real credentials: Cesium ion / JWT tokens, Mapbox, Google, GitHub, AWS and private keys.
const SECRET_PATTERNS = [
  ['JWT / Cesium ion token', /eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}/],
  ['Mapbox token', /\b[ps]k\.[A-Za-z0-9]{20,}\.[A-Za-z0-9_-]{10,}/],
  ['Google API key', /AIza[0-9A-Za-z_-]{30,}/],
  ['GitHub token', /\bgh[pousr]_[A-Za-z0-9]{30,}/],
  ['AWS access key', /\bAKIA[0-9A-Z]{16}\b/],
  ['Private key block', /-----BEGIN [A-Z ]*PRIVATE KEY-----/],
];

describe('security: no secrets in the code', () => {
  it('has no hardcoded tokens or keys in any project file', () => {
    const hits = [];
    for (const file of projectFiles()) {
      const text = readFileSync(file, 'utf8');
      for (const [label, pattern] of SECRET_PATTERNS) {
        if (pattern.test(text)) hits.push(`${file.replace(root, '')}: looks like a ${label}`);
      }
    }
    expect(hits).toEqual([]);
  });

  it('reads every token from environment variables, never from a string in the code', () => {
    const source = projectFiles(join(root, 'src'))
      .filter((f) => !f.includes('__tests__'))
      .map((f) => readFileSync(f, 'utf8'))
      .join('\n');
    expect(source).toMatch(/import\.meta\.env\.VITE_CESIUM_ION_TOKEN/);
    expect(source).toMatch(/import\.meta\.env\.VITE_MAPBOX_TOKEN/);
    expect(source).not.toMatch(/(?:accessToken|defaultAccessToken)\s*=\s*['"`][^'"`\s]+['"`]/);
  });
});

describe('security: .env stays private', () => {
  const ignore = readFileSync(join(root, '.gitignore'), 'utf8').split(/\r?\n/);
  const envLines = readFileSync(join(root, '.env.example'), 'utf8')
    .split(/\r?\n/)
    .filter((l) => /^[A-Z_]+=/.test(l));

  it('git-ignores .env and every .env.* variant, but keeps .env.example public', () => {
    expect(ignore).toContain('.env');
    expect(ignore).toContain('.env.*');
    expect(ignore).toContain('!.env.example');
  });

  it('ships .env.example with empty token values only', () => {
    const tokenLines = envLines.filter((l) => /TOKEN|KEY|SECRET/.test(l));
    expect(tokenLines.length).toBeGreaterThan(0);
    for (const line of tokenLines) expect(line.split('=')[1]).toBe('');
  });

  it('only exposes variables meant for the browser (VITE_ prefix) and documents that they are public', () => {
    for (const line of envLines) expect(line).toMatch(/^VITE_/);
    expect(readFileSync(join(root, 'README.md'), 'utf8')).toMatch(/Browser tokens are public by design/);
  });
});
