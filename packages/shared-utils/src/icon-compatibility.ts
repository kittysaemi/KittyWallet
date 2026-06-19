export type RegisteredIcon = {
  iconCode: string;
  providerType: string;
  providerKey: string;
  providerVersion?: string;
};

export type IconSnapshotFormat = "icon-node" | "svg";

export type IconSnapshot = {
  snapshotHash: string;
  providerType: string;
  snapshotFormat: IconSnapshotFormat;
  snapshotPayload: unknown;
  sourceProviderKey: string;
  sourceProviderVersion: string;
};

export type IconRenameReason = "alias" | "manual-map";

export type IconSnapshotRequiredReason = "removed" | "missing" | "brand-removed";

export type IconProviderAliasResolution = {
  nextProviderKey: string;
  reason: IconRenameReason;
};

export type IconCompatibilityResult =
  | {
      type: "unchanged";
      icon: RegisteredIcon;
    }
  | {
      type: "renamed";
      icon: RegisteredIcon;
      nextProviderKey: string;
      reason: IconRenameReason;
    }
  | {
      type: "snapshot-required";
      icon: RegisteredIcon;
      reason: IconSnapshotRequiredReason;
    }
  | {
      type: "manual-review";
      icon: RegisteredIcon;
      reason: string;
      candidates?: string[];
    };

export type IconCompatibilitySummary = {
  unchanged: number;
  renamed: number;
  snapshotRequired: number;
  manualReview: number;
};

export type IconCompatibilityReport = {
  providerType: string;
  fromVersion?: string;
  toVersion: string;
  summary: IconCompatibilitySummary;
  items: IconCompatibilityResult[];
};

export interface IconProviderCompatibilityAdapter {
  readonly providerType: string;
  getAvailableKeys(args: { version: string }): Promise<Set<string>>;
  resolveAlias(args: {
    providerKey: string;
    fromVersion?: string;
    toVersion: string;
  }): Promise<IconProviderAliasResolution | null>;
  createSnapshot(args: {
    providerKey: string;
    fromVersion: string;
  }): Promise<IconSnapshot | null>;
}

export type CreateIconCompatibilityReportInput = {
  providerType: string;
  fromVersion?: string;
  toVersion: string;
  icons: RegisteredIcon[];
  availableKeys: Iterable<string>;
  resolveAlias?: (icon: RegisteredIcon) => Promise<IconProviderAliasResolution | null>;
  canCreateSnapshot?: (icon: RegisteredIcon) => Promise<boolean>;
  getMissingReason?: (icon: RegisteredIcon) => IconSnapshotRequiredReason;
  getManualReviewCandidates?: (icon: RegisteredIcon) => string[] | undefined;
};

export async function createIconCompatibilityReport(
  input: CreateIconCompatibilityReportInput
): Promise<IconCompatibilityReport> {
  const availableKeySet = new Set(input.availableKeys);
  const items: IconCompatibilityResult[] = [];

  for (const icon of input.icons) {
    items.push(await classifyIcon(icon, input, availableKeySet));
  }

  return {
    providerType: input.providerType,
    fromVersion: input.fromVersion,
    toVersion: input.toVersion,
    summary: summarizeIconCompatibility(items),
    items
  };
}

export function summarizeIconCompatibility(
  items: IconCompatibilityResult[]
): IconCompatibilitySummary {
  return items.reduce<IconCompatibilitySummary>(
    (summary, item) => {
      if (item.type === "snapshot-required") {
        summary.snapshotRequired += 1;
        return summary;
      }

      if (item.type === "manual-review") {
        summary.manualReview += 1;
        return summary;
      }

      summary[item.type] += 1;
      return summary;
    },
    {
      unchanged: 0,
      renamed: 0,
      snapshotRequired: 0,
      manualReview: 0
    }
  );
}

async function classifyIcon(
  icon: RegisteredIcon,
  input: CreateIconCompatibilityReportInput,
  availableKeySet: ReadonlySet<string>
): Promise<IconCompatibilityResult> {
  if (icon.providerType !== input.providerType) {
    return manualReview(icon, "provider-type-mismatch", input);
  }

  if (availableKeySet.has(icon.providerKey)) {
    return {
      type: "unchanged",
      icon
    };
  }

  const aliasResolution = await input.resolveAlias?.(icon);

  if (aliasResolution) {
    if (availableKeySet.has(aliasResolution.nextProviderKey)) {
      return {
        type: "renamed",
        icon,
        nextProviderKey: aliasResolution.nextProviderKey,
        reason: aliasResolution.reason
      };
    }

    return manualReview(icon, "alias-target-missing", input);
  }

  const canCreateSnapshot = (await input.canCreateSnapshot?.(icon)) ?? true;

  if (!canCreateSnapshot) {
    return manualReview(icon, "snapshot-unavailable", input);
  }

  return {
    type: "snapshot-required",
    icon,
    reason: input.getMissingReason?.(icon) ?? "missing"
  };
}

function manualReview(
  icon: RegisteredIcon,
  reason: string,
  input: CreateIconCompatibilityReportInput
): IconCompatibilityResult {
  const candidates = input.getManualReviewCandidates?.(icon);

  return {
    type: "manual-review",
    icon,
    reason,
    ...(candidates && candidates.length > 0 ? { candidates } : {})
  };
}
