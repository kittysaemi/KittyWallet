import * as installedLucideStatic from "lucide-static";
import installedLucideStaticPackage from "lucide-static/package.json";
import {
  IconProviderAliasResolution,
  IconProviderCompatibilityAdapter,
  IconSnapshot,
  IconSnapshotRequiredReason
} from "./icon-compatibility";

type LucideStaticExports = Record<string, unknown>;

export type LucideCompatibilitySource = {
  version: string;
  icons: LucideStaticExports;
};

export type LucideCompatibilityAdapterOptions = {
  sources?: LucideCompatibilitySource[];
  aliases?: Readonly<Record<string, string>>;
  manualMap?: Readonly<Record<string, string>>;
  brandRemovedKeys?: Iterable<string>;
};

const toKebabCase = (value: string): string =>
  value
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/([A-Z])([A-Z][a-z])/g, "$1-$2")
    .toLowerCase();

const installedSource: LucideCompatibilitySource = {
  version: installedLucideStaticPackage.version,
  icons: installedLucideStatic
};

// These are documented Lucide aliases, not similarity-based replacements.
export const LUCIDE_ALIAS_MAP: Readonly<Record<string, string>> = {
  "check-circle-2": "circle-check",
  edit: "square-pen",
  "edit-2": "pen",
  "edit-3": "pen-line",
  "more-horizontal": "ellipsis",
  "more-vertical": "ellipsis-vertical"
};

export class LucideCompatibilityAdapter implements IconProviderCompatibilityAdapter {
  readonly providerType = "lucide";

  private readonly sourcesByVersion: ReadonlyMap<string, LucideCompatibilitySource>;
  private readonly aliases: Readonly<Record<string, string>>;
  private readonly manualMap: Readonly<Record<string, string>>;
  private readonly brandRemovedKeys: ReadonlySet<string>;

  constructor(options: LucideCompatibilityAdapterOptions = {}) {
    const sources = options.sources ?? [installedSource];

    this.sourcesByVersion = new Map(sources.map((source) => [source.version, source]));
    this.aliases = options.aliases ?? LUCIDE_ALIAS_MAP;
    this.manualMap = options.manualMap ?? {};
    this.brandRemovedKeys = new Set(options.brandRemovedKeys ?? []);
  }

  async getAvailableKeys(args: { version: string }): Promise<Set<string>> {
    return new Set(this.getSource(args.version).keys);
  }

  async resolveAlias(args: {
    providerKey: string;
    fromVersion?: string;
    toVersion: string;
  }): Promise<IconProviderAliasResolution | null> {
    const nextProviderKey = this.aliases[args.providerKey];
    if (nextProviderKey) {
      return { nextProviderKey, reason: "alias" };
    }

    const manualProviderKey = this.manualMap[args.providerKey];
    if (manualProviderKey) {
      return { nextProviderKey: manualProviderKey, reason: "manual-map" };
    }

    return null;
  }

  async createSnapshot(args: { providerKey: string; fromVersion: string }): Promise<IconSnapshot | null> {
    const source = this.getSource(args.fromVersion);
    const svg = source.svgByKey.get(args.providerKey);
    if (!svg) return null;

    return {
      snapshotHash: hashSvg(svg),
      providerType: this.providerType,
      snapshotFormat: "svg",
      snapshotPayload: svg,
      sourceProviderKey: args.providerKey,
      sourceProviderVersion: args.fromVersion
    };
  }

  getMissingReason(providerKey: string): IconSnapshotRequiredReason {
    return this.brandRemovedKeys.has(providerKey) ? "brand-removed" : "removed";
  }

  private getSource(version: string): PreparedLucideSource {
    const source = this.sourcesByVersion.get(version);
    if (!source) {
      throw new Error(`Lucide source version is not configured: ${version}`);
    }

    return prepareSource(source);
  }
}

type PreparedLucideSource = {
  keys: ReadonlySet<string>;
  svgByKey: ReadonlyMap<string, string>;
};

function prepareSource(source: LucideCompatibilitySource): PreparedLucideSource {
  const svgByKey = new Map<string, string>();

  for (const [exportName, value] of Object.entries(source.icons)) {
    if (typeof value === "string" && value.trimStart().startsWith("<svg")) {
      svgByKey.set(toKebabCase(exportName), value);
    }
  }

  return {
    keys: new Set(svgByKey.keys()),
    svgByKey
  };
}

function hashSvg(value: string): string {
  let hash = 0x811c9dc5;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }

  return `fnv1a-${(hash >>> 0).toString(16).padStart(8, "0")}`;
}
