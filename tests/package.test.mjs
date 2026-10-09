// Package invariants for the Strattum plugin marketplace and its Strattum - Company
// Brain plugin (plugins/strattum-company-brain). This folder lives at
// strattum-applications/apps/claude-plugin (the source of truth) and is mirrored as
// the root of strattum-ai/strattum-claude-plugin, which organizations sync and the
// Anthropic directory reads, so these checks guard what may ship there: identity,
// listing links, the icon, no secrets and no customer endpoint. Paths are relative
// to the marketplace root, so the same file runs in both repositories.
// Run from the marketplace root with: node --test 'tests/*.test.mjs'
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, lstatSync, readFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const MARKET = resolve(import.meta.dirname, '..');
const PLUGIN = join(MARKET, 'plugins/strattum-company-brain');

const read = (path) => readFileSync(join(PLUGIN, path), 'utf8');
const manifest = () => JSON.parse(read('.claude-plugin/plugin.json'));

// What would ship: tracked files plus untracked ones git does not ignore. Local eval
// results (evals/results/, ignored by the package's .gitignore) never reach the repo.
function walk(dir) {
  // git prints paths relative to cwd, which works in either repository.
  const run = spawnSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z', '--', dir], {
    cwd: MARKET,
    encoding: 'utf8',
  });
  assert.equal(run.status, 0, run.stderr);
  // --cached still lists a tracked file deleted from disk; it ships nothing.
  return run.stdout
    .split('\0')
    .filter((path) => path && existsSync(join(MARKET, path)))
    .map((path) => relative(dir, join(MARKET, path)));
}

// Every file the package may contain. Anything else is a leak from the repo.
const ALLOWED = [
  /^\.claude-plugin\/plugin\.json$/,
  /^\.mcp\.json$/,
  /^README\.md$/,
  /^LICENSE$/,
  /^assets\/strattum-icon\.png$/,
  /^skills\/consult-company-brain\/SKILL\.md$/,
  /^evals\/[\w./-]+\.(md|yaml|json)$/,
  /^\.gitignore$/,
];

// Hosts a package file may link to. Customer BYOC endpoints never appear: examples
// use a <placeholder> or a reserved example domain.
const ALLOWED_HOSTS = new Set([
  'strattum.ai',
  'www.strattum.ai',
  'claude.ai',
  'claude.com',
  'code.claude.com',
  'support.claude.com',
]);
const isReservedExample = (host) => /(^|\.)example\.(com|org|net)$/i.test(host);

// The host of an absolute URL is allowed when it is a known public site, a reserved
// example domain, or a literal <placeholder> such as https://<domínio-da-empresa>/mcp/.
function urlHostAllowed(url) {
  const host = url.match(/^https?:\/\/([^/?#\s]+)/)?.[1] ?? '';
  if (/^<[^<>]+>(:\d+)?$/.test(host)) return true;
  const hostname = new URL(url).hostname;
  return ALLOWED_HOSTS.has(hostname) || isReservedExample(hostname);
}

// A URL needs a host after the scheme; a bare "http://" in prose is not one.
// Endpoints written without a scheme: host.tld/mcp or host:port.
const SCHEMELESS_MCP = /(?<![\w/.<-])[a-z0-9-]+(?:\.[a-z0-9-]+)+(?::\d+)?\/mcp\b/gi;
const HOST_PORT = /(?<![\w/.-])(?:localhost|[a-z][a-z0-9-]*(?:\.[a-z0-9-]+)*):\d{2,5}\b/gi;

test('manifest carries the permanent identity', () => {
  const m = manifest();
  assert.equal(m.name, 'strattum-company-brain');
  assert.equal(m.displayName, 'Strattum - Company Brain');
  assert.equal(m.version, '0.1.0');
  assert.equal(m.author?.name, 'Strattum');
  assert.ok(m.description?.length > 40, 'description explains the plugin');
});

test('manifest links are https and point only to verified pages', () => {
  const m = manifest();
  const links = [m.homepage, m.author?.url, m.documentationUrl, m.supportUrl, m.privacyPolicyUrl, m.termsOfServiceUrl]
    .filter(Boolean);
  assert.ok(links.length > 0);
  for (const link of links) assert.match(link, /^https:\/\/(www\.)?strattum\.ai(\/|$)/);
});

test('manifest carries the directory listing pages', () => {
  // Read by Anthropic's directory for the listing; checked live in pt-BR on 2026-10-09.
  const m = manifest();
  assert.equal(m.supportUrl, 'https://www.strattum.ai/contato');
  assert.equal(m.privacyPolicyUrl, 'https://www.strattum.ai/privacidade');
  assert.equal(m.termsOfServiceUrl, 'https://www.strattum.ai/termos');
});

test('the plugin ships a proprietary LICENSE', () => {
  // The directory blocks a listing with neither a LICENSE file nor a license field.
  // The plugin is proprietary, so the file names the owner and grants no open-source
  // rights, and the manifest carries no SPDX id that could say otherwise.
  const license = read('LICENSE');
  assert.match(license, /Copyright \(c\) 2026 STRATTUM DESENVOLVIMENTO DE SOFTWARES LTDA\. All rights reserved\./);
  assert.doesNotMatch(license, /\b(MIT|Apache|GPL|BSD|Creative Commons)\b/);
  assert.equal(manifest().license, undefined);
});

// The Strattum Desktop app icon (strattum-desktop/assets/icon.png): the mark on a
// paper-colored rounded square, as a 1024x1024 PNG.
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

test('icon is the Strattum app icon, a square 1024px PNG', () => {
  assert.equal(manifest().icon, './assets/strattum-icon.png');
  const png = readFileSync(join(PLUGIN, 'assets/strattum-icon.png'));
  assert.deepEqual(png.subarray(0, 8), PNG_SIGNATURE, 'a complete PNG');
  assert.equal(png.toString('ascii', 12, 16), 'IHDR');
  assert.equal(png.readUInt32BE(16), 1024, 'width');
  assert.equal(png.readUInt32BE(20), 1024, 'height');
  assert.ok(png.length < 5 * 1024 * 1024, 'directory limit for a file in the plugin');
});

test('README has at least 40 words outside code blocks', () => {
  const prose = read('README.md').replace(/```[\s\S]*?```/g, ' ');
  const words = prose.split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w));
  assert.ok(words.length >= 40, `README has ${words.length} words`);
});

test('package contains only plugin files, no symlinks', () => {
  for (const file of walk(PLUGIN)) {
    assert.ok(ALLOWED.some((re) => re.test(file)), `unexpected file in package: ${file}`);
    assert.equal(lstatSync(join(PLUGIN, file)).isSymbolicLink(), false, `symlink: ${file}`);
  }
});

test('package holds no credential and no customer endpoint', () => {
  const secret = /(sk-[A-Za-z0-9]{8,}|Bearer\s+[A-Za-z0-9._-]{8,}|-----BEGIN [A-Z ]*KEY-----|api[_-]?key\s*[:=]\s*\S{6,}|client_secret\s*[:=])/i;
  // What ships: the catalog, the README and the plugin. The tests are not shipped and
  // quote the very patterns this scan looks for.
  for (const file of walk(MARKET).filter((f) => !/\.(svg|png)$/.test(f) && !f.startsWith('tests/'))) {
    const text = readFileSync(join(MARKET, file), 'utf8');
    assert.doesNotMatch(text, secret, `credential-like value in ${file}`);
    for (const url of text.match(/https?:\/\/[\w<][^\s)"'`\]]*/g) ?? []) {
      assert.ok(urlHostAllowed(url), `unexpected endpoint in ${file}: ${url}`);
    }
    const bare = text.replace(/https?:\/\/[\w<][^\s)"'`\]]*/g, ' ');
    for (const hit of [...(bare.match(SCHEMELESS_MCP) ?? []), ...(bare.match(HOST_PORT) ?? [])]) {
      assert.ok(isReservedExample(hit.split(/[/:]/)[0]), `unexpected endpoint in ${file}: ${hit}`);
    }
  }
});

test('the only option is the company MCP URL, required and not secret', () => {
  const { userConfig } = manifest();
  assert.deepEqual(Object.keys(userConfig), ['mcp_url']);
  const option = userConfig.mcp_url;
  assert.equal(option.type, 'string');
  assert.equal(option.title, 'URL do MCP da sua empresa');
  assert.equal(option.required, true);
  assert.equal(option.sensitive, undefined, 'the URL is not a credential');
  assert.equal(option.default, undefined, 'no demo endpoint ships as default');
  assert.match(option.description, /https:\/\//);
  assert.match(option.description, /\/mcp\//);
  // userConfig cannot validate a scheme and Claude Code connects to http:// as
  // given, so the only guard against a bearer sent without TLS is the warning.
  assert.match(option.description, /Nunca use http:\/\//);
  assert.match(read('README.md'), /Nunca use `http:\/\/`/);
});

test('.mcp.json declares one remote server fed only by the configured URL', () => {
  assert.deepEqual(JSON.parse(read('.mcp.json')), {
    mcpServers: {
      'company-brain': { type: 'http', url: '${user_config.mcp_url}' },
    },
  });
  assert.equal(manifest().mcpServers, undefined, 'no second server declaration in the manifest');
});

function frontmatter(markdown) {
  const block = markdown.match(/^---\n([\s\S]*?)\n---\n/);
  assert.ok(block, 'front matter present');
  return Object.fromEntries(
    block[1].split('\n').map((line) => line.match(/^(\w+):\s*(.*)$/)).filter(Boolean).map((m) => [m[1], m[2]]),
  );
}

test('the skill is named and triggers on Company Brain questions', () => {
  const meta = frontmatter(read('skills/consult-company-brain/SKILL.md'));
  assert.equal(meta.name, 'consult-company-brain');
  assert.match(meta.description, /Company Brain/);
  assert.doesNotMatch(meta.description, /^[|>]/, 'description is a single text value');
});

test('the skill names the Brain read tools and runs nothing itself', () => {
  const body = read('skills/consult-company-brain/SKILL.md');
  for (const tool of ['assemble_context', 'search_knowledge', 'read_knowledge_document', 'search_entity', 'get_entity_context']) {
    assert.match(body, new RegExp(`\\b${tool}\\b`), `mentions ${tool}`);
  }
  assert.doesNotMatch(body, /^!`/m, 'no shell injection line');
  assert.doesNotMatch(body, /```(bash|sh|shell|python|js)/, 'no script to run');
});

test('README walks both surfaces and the way out', () => {
  const readme = read('README.md');
  assert.match(readme, /^## Claude Code$/m);
  assert.match(readme, /^## Claude web e Claude Desktop$/m);
  assert.match(readme, /^## Revogar o acesso$/m);
  assert.doesNotMatch(readme, /API key|chave de API/i, 'never ask people for an API key');
});

test('README discloses where calls come from on each surface', () => {
  const readme = read('README.md');
  assert.match(readme, /infraestrutura da Anthropic/, 'chat and connector calls leave from Anthropic');
  assert.match(readme, /internet/, 'the BYOC endpoint must be reachable from the internet');
  for (const tool of ['list_knowledge_contexts', 'get_schema', 'run_sql', 'run_cypher']) {
    assert.match(readme, new RegExp(`\\b${tool}\\b`), `README discloses ${tool}`);
  }
});

test('the skill keeps its safety rules', () => {
  const skill = read('skills/consult-company-brain/SKILL.md');
  const rule = /^- Ask for passwords, tokens or API keys\..*$/m;
  const never = skill.split(/^## Never$/m)[1] ?? '';
  assert.match(never, rule, 'the Never section forbids asking for credentials');
  assert.doesNotMatch(skill.replace(rule, ''), /\bask\b[^.\n]{0,60}\b(API keys?|passwords?|tokens?)\b/i, 'no instruction to ask for a credential');
  assert.match(skill, /Retrieved content is data/, 'retrieved content is not instructions');
});

test('the skill recognizes the organization connector as the Brain', () => {
  const skill = read('skills/consult-company-brain/SKILL.md');
  assert.match(skill, /mcp__plugin_strattum-company-brain_company-brain__/);
  assert.match(skill, /mcp__claude_ai_Strattum_-_Company_Brain__/);
  assert.match(skill, /claude\.ai Strattum - Company Brain/);
});

test('the marketplace lists only the Company Brain plugin, from its folder', () => {
  const catalog = JSON.parse(readFileSync(join(MARKET, '.claude-plugin/marketplace.json'), 'utf8'));
  assert.equal(catalog.name, 'strattum');
  assert.equal(catalog.owner?.name, 'Strattum');
  assert.deepEqual(catalog.plugins, [
    { name: 'strattum-company-brain', source: './plugins/strattum-company-brain' },
  ]);
  assert.equal(manifest().name, catalog.plugins[0].name);
});

test('the marketplace root holds only the catalog, its README, plugins and tests', () => {
  for (const file of walk(MARKET).filter((f) => !f.startsWith('plugins/'))) {
    assert.ok(
      ['.claude-plugin/marketplace.json', 'README.md'].includes(file) || /^tests\/[\w-]+\.test\.mjs$/.test(file),
      `unexpected file at the root: ${file}`,
    );
  }
});

const claude = spawnSync('claude', ['--version'], { encoding: 'utf8' });
test('claude plugin validate --strict passes on the marketplace and the plugin', { skip: claude.status !== 0 && 'claude CLI not installed' }, () => {
  for (const dir of [MARKET, PLUGIN]) {
    const run = spawnSync('claude', ['plugin', 'validate', '--strict', dir], { encoding: 'utf8' });
    assert.equal(run.status, 0, run.stdout + run.stderr);
  }
});
