/// <reference types="bun" />

import { readFileSync, realpathSync } from 'node:fs';
import { delimiter, dirname, join, sep } from 'node:path';

/** Seconds. Compared with the bunfig integer and with Dependabot's cooldown. */
type Seconds = number & { readonly __brand: 'Seconds' };

type AgeGate = {
  /** No exemption field. A committed exclude would let a fresh release through this gate. */
  readonly minimumReleaseAge: Seconds;
};

type PolicyProblem = string;

type ParsedGate =
  | { readonly ok: true; readonly gate: AgeGate }
  | { readonly ok: false; readonly problems: readonly PolicyProblem[] };

type Cooldown = {
  readonly days: number;
};

type CfSpecifier =
  | { readonly kind: 'exact'; readonly version: string }
  | { readonly kind: 'not-exact'; readonly raw: string };

type SatteriResolution = {
  readonly rootSpecifier: string;
  readonly resolvedIds: readonly string[];
};

type CfBin = {
  readonly printedVersion: string;
  readonly cfPath: string;
  readonly wranglerShimPath: string;
};

const releaseAgeFloor = 259200 as Seconds;
const satteri = '@astrojs/markdown-satteri';
const exactVersionPattern = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z]+(?:\.[0-9A-Za-z]+)*)?$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readAgeGate(bunfigText: string): ParsedGate {
  const ages: Seconds[] = [];
  for (const line of bunfigText.split('\n')) {
    const trimmed = line.trim();
    if (trimmed.startsWith('#')) continue;
    if (trimmed.includes('minimumReleaseAgeExcludes')) {
      return { ok: false, problems: ['bunfig.toml contains minimumReleaseAgeExcludes'] };
    }
    const match = trimmed.match(/^minimumReleaseAge\s*=\s*(\d+)\s*(?:#.*)?$/);
    if (match) {
      ages.push(Number(match[1]) as Seconds);
      continue;
    }
    if (/(?:^|\s)minimumReleaseAge(?:\s|=)/.test(trimmed)) {
      return {
        ok: false,
        problems: [`bunfig.toml minimumReleaseAge is not an integer (${trimmed})`],
      };
    }
  }
  const age = ages[0];
  if (ages.length !== 1 || age === undefined) {
    return {
      ok: false,
      problems: [
        ages.length === 0
          ? 'bunfig.toml has no minimumReleaseAge'
          : `bunfig.toml sets minimumReleaseAge ${ages.length} times`,
      ],
    };
  }
  return { ok: true, gate: { minimumReleaseAge: age } };
}

function readCooldown(dependabotText: string): Cooldown {
  const days = new Set<number>();
  for (const line of dependabotText.split('\n')) {
    const trimmed = line.trim();
    if (trimmed.startsWith('#')) continue;
    const match = trimmed.match(/^default-days:\s*["']?(\d+)["']?\s*(?:#.*)?$/);
    if (match) days.add(Number(match[1]));
  }
  if (days.size !== 1) {
    const found = [...days].join(', ');
    throw new Error(
      days.size === 0
        ? 'dependabot.yml has no default-days cooldown'
        : `dependabot.yml default-days is not a single value (${found})`,
    );
  }
  const daysValue = [...days][0];
  if (daysValue === undefined) throw new Error('dependabot.yml has no default-days cooldown');
  return { days: daysValue };
}

function floorProblem(age: Seconds): readonly PolicyProblem[] {
  if (age === releaseAgeFloor) return [];
  return [`minimumReleaseAge is ${age}, expected ${releaseAgeFloor}`];
}

function ageGateProblems(gate: AgeGate, cooldown: Cooldown): readonly PolicyProblem[] {
  const problems: PolicyProblem[] = [...floorProblem(gate.minimumReleaseAge)];
  const cooldownSeconds = cooldown.days * 24 * 60 * 60;
  if (!(gate.minimumReleaseAge < cooldownSeconds)) {
    problems.push(
      `minimumReleaseAge ${gate.minimumReleaseAge} is not under Dependabot cooldown ${cooldown.days} days`,
    );
  }
  return problems;
}

function classifyCfSpecifier(raw: string): CfSpecifier {
  if (exactVersionPattern.test(raw)) return { kind: 'exact', version: raw };
  return { kind: 'not-exact', raw };
}

function requireExactCf(spec: CfSpecifier): string {
  switch (spec.kind) {
    case 'exact':
      return spec.version;
    case 'not-exact':
      throw new Error(`cf specifier must be an exact version, got ${spec.raw}`);
    default: {
      const neverSpec: never = spec;
      return neverSpec;
    }
  }
}

function directCfSpecifier(packageJsonText: string): string {
  const parsed: unknown = JSON.parse(packageJsonText);
  if (!isRecord(parsed)) throw new Error('package.json is not an object');
  const dependencies = isRecord(parsed.dependencies) ? parsed.dependencies.cf : undefined;
  const devDependencies = isRecord(parsed.devDependencies) ? parsed.devDependencies.cf : undefined;
  if (
    typeof dependencies === 'string' &&
    typeof devDependencies === 'string' &&
    dependencies !== devDependencies
  ) {
    throw new Error(
      `cf specifier is ${dependencies} in dependencies and ${devDependencies} in devDependencies`,
    );
  }
  const raw = typeof devDependencies === 'string' ? devDependencies : dependencies;
  if (typeof raw !== 'string') throw new Error('package.json has no direct cf specifier');
  return raw;
}

function readSatteri(lockfileText: string): SatteriResolution {
  const parsed: unknown = Bun.JSONC.parse(lockfileText);
  if (!isRecord(parsed)) throw new Error('bun.lock is not an object');
  const workspaces = isRecord(parsed.workspaces) ? parsed.workspaces : undefined;
  const root = workspaces && isRecord(workspaces['']) ? workspaces[''] : undefined;
  const dependencies = root && isRecord(root.dependencies) ? root.dependencies : undefined;
  const rootValue = dependencies?.[satteri];
  const rootSpecifier = typeof rootValue === 'string' ? rootValue : '';
  const packages = isRecord(parsed.packages) ? parsed.packages : undefined;
  const resolvedIds: string[] = [];
  if (packages) {
    for (const [key, entry] of Object.entries(packages)) {
      // Bun names a nested copy `<parent>/@astrojs/markdown-satteri`.
      const nested = key.endsWith(`/${satteri}`);
      if (key !== satteri && !nested) continue;
      if (!Array.isArray(entry) || typeof entry[0] !== 'string') {
        throw new Error(`bun.lock entry ${key} has no resolution id`);
      }
      resolvedIds.push(entry[0]);
    }
  }
  return { rootSpecifier, resolvedIds };
}

function hasRangeMarker(specifier: string): boolean {
  if (/[\^~*<>\s|]/.test(specifier)) return true;
  return specifier.split('.').some((part) => part === 'x' || part === 'X');
}

function satteriProblems(found: SatteriResolution): readonly PolicyProblem[] {
  const problems: PolicyProblem[] = [];
  if (found.rootSpecifier.length === 0) {
    problems.push(`${satteri} root specifier is missing`);
  } else if (hasRangeMarker(found.rootSpecifier)) {
    problems.push(`${satteri} root specifier ${found.rootSpecifier} is not exact`);
  }
  const expected = `${satteri}@${found.rootSpecifier}`;
  if (found.resolvedIds.length !== 1) {
    const listed = found.resolvedIds.join(', ');
    problems.push(
      `${satteri} has ${found.resolvedIds.length} lockfile resolutions${listed ? `: ${listed}` : ''}`,
    );
  } else if (found.resolvedIds[0] !== expected) {
    problems.push(`${satteri} resolution ${found.resolvedIds[0]} does not equal ${expected}`);
  }
  return problems;
}

function realBin(path: string): string {
  try {
    return realpathSync(path);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return `missing ${path} (${message})`;
  }
}

function isInsidePackage(realPath: string, packageName: string): boolean {
  return realPath.includes(`${sep}node_modules${sep}${packageName}${sep}`);
}

function readCfBin(repoRoot: string): CfBin {
  const bunDir = dirname(process.execPath);
  // A bunx earlier on PATH can be a different Bun than the one running this script.
  const proc = Bun.spawnSync(['bunx', 'cf', '--version'], {
    cwd: repoRoot,
    stdout: 'pipe',
    stderr: 'pipe',
    env: {
      ...process.env,
      PATH: `${bunDir}${delimiter}${process.env.PATH ?? ''}`,
    },
  });
  const stdout = proc.stdout.toString();
  const stderr = proc.stderr.toString().trim();
  const printedVersion =
    proc.exitCode === 0
      ? stdout
      : `exit ${proc.exitCode ?? 'unknown'}${stderr ? `: ${stderr}` : ''}`;
  return {
    printedVersion,
    cfPath: realBin(join(repoRoot, 'node_modules', '.bin', 'cf')),
    wranglerShimPath: realBin(join(repoRoot, 'node_modules', '.bin', 'cf-wrangler')),
  };
}

function cfBinProblems(bin: CfBin, exactVersion: string): readonly PolicyProblem[] {
  const problems: PolicyProblem[] = [];
  const printed = bin.printedVersion.trim();
  if (printed !== exactVersion) {
    problems.push(`bunx cf --version printed ${printed}, expected ${exactVersion}`);
  }
  if (!isInsidePackage(bin.cfPath, 'cf') || bin.cfPath.includes('cf-wrangler')) {
    problems.push(`node_modules/.bin/cf resolves to ${bin.cfPath}`);
  }
  if (!isInsidePackage(bin.wranglerShimPath, 'wrangler')) {
    problems.push(`node_modules/.bin/cf-wrangler resolves to ${bin.wranglerShimPath}`);
  }
  if (bin.cfPath === bin.wranglerShimPath) {
    problems.push(
      'node_modules/.bin/cf and node_modules/.bin/cf-wrangler resolve to the same file',
    );
  }
  return problems;
}

function problemText(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function checkInstallPolicy(repoRoot: string): readonly PolicyProblem[] {
  const problems: PolicyProblem[] = [];
  const gate = readAgeGate(readFileSync(join(repoRoot, 'bunfig.toml'), 'utf8'));
  let cooldown: Cooldown | undefined;
  try {
    cooldown = readCooldown(readFileSync(join(repoRoot, '.github/dependabot.yml'), 'utf8'));
  } catch (error) {
    problems.push(problemText(error));
  }

  switch (gate.ok) {
    case true:
      problems.push(
        ...(cooldown
          ? ageGateProblems(gate.gate, cooldown)
          : floorProblem(gate.gate.minimumReleaseAge)),
      );
      break;
    case false:
      problems.push(...gate.problems);
      break;
    default: {
      const neverGate: never = gate;
      return neverGate;
    }
  }

  let exactVersion: string | undefined;
  try {
    exactVersion = requireExactCf(
      classifyCfSpecifier(directCfSpecifier(readFileSync(join(repoRoot, 'package.json'), 'utf8'))),
    );
  } catch (error) {
    problems.push(problemText(error));
  }

  try {
    problems.push(
      ...satteriProblems(readSatteri(readFileSync(join(repoRoot, 'bun.lock'), 'utf8'))),
    );
  } catch (error) {
    problems.push(problemText(error));
  }

  try {
    const bin = readCfBin(repoRoot);
    if (exactVersion !== undefined) problems.push(...cfBinProblems(bin, exactVersion));
  } catch (error) {
    problems.push(problemText(error));
  }

  return problems;
}

function main(): void {
  const problems = checkInstallPolicy(join(import.meta.dir, '..'));
  for (const problem of problems) console.log(`FAIL ${problem}`);
  console.log(
    problems.length
      ? `\n${problems.length} problem(s) in the install policy`
      : 'ok   install policy: release age, exact cf, one markdown-satteri',
  );
  process.exit(problems.length ? 1 : 0);
}

main();
