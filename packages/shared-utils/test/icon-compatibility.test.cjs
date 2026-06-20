const assert = require("node:assert/strict");
const test = require("node:test");

const {
  createIconCompatibilityReport,
  LucideCompatibilityAdapter,
  summarizeIconCompatibility
} = require("../dist/index.js");

const icon = (providerKey, extra = {}) => ({
  iconCode: `icon-${providerKey}`,
  providerType: "lucide",
  providerKey,
  ...extra
});

test("classifies unchanged, renamed, snapshot-required, and manual-review icons", async () => {
  const report = await createIconCompatibilityReport({
    providerType: "lucide",
    fromVersion: "0.511.0",
    toVersion: "1.17.0",
    icons: [
      icon("wallet"),
      icon("edit-2"),
      icon("brand-github"),
      icon("ghost-icon"),
      icon("custom-provider-icon", { providerType: "custom" })
    ],
    availableKeys: ["wallet", "pen"],
    resolveAlias: async (registeredIcon) => {
      if (registeredIcon.providerKey === "edit-2") {
        return { nextProviderKey: "pen", reason: "alias" };
      }

      if (registeredIcon.providerKey === "ghost-icon") {
        return { nextProviderKey: "not-present", reason: "manual-map" };
      }

      return null;
    },
    canCreateSnapshot: async (registeredIcon) => registeredIcon.providerKey !== "ghost-icon",
    getMissingReason: (registeredIcon) =>
      registeredIcon.providerKey === "brand-github" ? "brand-removed" : "missing",
    getManualReviewCandidates: (registeredIcon) =>
      registeredIcon.providerKey === "ghost-icon" ? ["ghost", "ghost-off"] : undefined
  });

  assert.deepEqual(report.summary, {
    unchanged: 1,
    renamed: 1,
    snapshotRequired: 1,
    manualReview: 2
  });

  assert.equal(report.items[0].type, "unchanged");
  assert.equal(report.items[1].type, "renamed");
  assert.equal(report.items[1].nextProviderKey, "pen");
  assert.equal(report.items[2].type, "snapshot-required");
  assert.equal(report.items[2].reason, "brand-removed");
  assert.equal(report.items[3].type, "manual-review");
  assert.equal(report.items[3].reason, "alias-target-missing");
  assert.deepEqual(report.items[3].candidates, ["ghost", "ghost-off"]);
  assert.equal(report.items[4].type, "manual-review");
  assert.equal(report.items[4].reason, "provider-type-mismatch");
});

test("does not classify unavailable snapshot items as automatic migrations", async () => {
  const report = await createIconCompatibilityReport({
    providerType: "lucide",
    fromVersion: "0.511.0",
    toVersion: "1.17.0",
    icons: [icon("removed-icon")],
    availableKeys: [],
    canCreateSnapshot: async () => false
  });

  assert.deepEqual(report.summary, {
    unchanged: 0,
    renamed: 0,
    snapshotRequired: 0,
    manualReview: 1
  });
  assert.deepEqual(report.items[0], {
    type: "manual-review",
    icon: icon("removed-icon"),
    reason: "snapshot-unavailable"
  });
});

test("summarizes report items without relying on provider-specific data", () => {
  assert.deepEqual(
    summarizeIconCompatibility([
      { type: "unchanged", icon: icon("wallet") },
      { type: "renamed", icon: icon("edit-2"), nextProviderKey: "pen", reason: "manual-map" },
      { type: "snapshot-required", icon: icon("old"), reason: "removed" },
      { type: "manual-review", icon: icon("unknown"), reason: "ambiguous" }
    ]),
    {
      unchanged: 1,
      renamed: 1,
      snapshotRequired: 1,
      manualReview: 1
    }
  );
});

test("reads Lucide keys and creates an SVG snapshot from the configured source version", async () => {
  const adapter = new LucideCompatibilityAdapter({
    sources: [
      {
        version: "1.0.0",
        icons: {
          Wallet: "<svg><path d=\"M1 1\" /></svg>",
          Pen: "<svg><path d=\"M2 2\" /></svg>"
        }
      }
    ]
  });

  const keys = await adapter.getAvailableKeys({ version: "1.0.0" });
  const snapshot = await adapter.createSnapshot({ providerKey: "wallet", fromVersion: "1.0.0" });

  assert.deepEqual([...keys].sort(), ["pen", "wallet"]);
  assert.deepEqual(snapshot, {
    snapshotHash: "fnv1a-4c08bfde",
    providerType: "lucide",
    snapshotFormat: "svg",
    snapshotPayload: "<svg><path d=\"M1 1\" /></svg>",
    sourceProviderKey: "wallet",
    sourceProviderVersion: "1.0.0"
  });
});

test("uses explicit Lucide aliases and keeps brand removals out of automatic replacements", async () => {
  const adapter = new LucideCompatibilityAdapter({
    sources: [
      { version: "1.0.0", icons: { Edit2: "<svg />", Github: "<svg />" } },
      { version: "2.0.0", icons: { Pen: "<svg />" } }
    ],
    brandRemovedKeys: ["github"]
  });

  const availableKeys = await adapter.getAvailableKeys({ version: "2.0.0" });
  const report = await createIconCompatibilityReport({
    providerType: "lucide",
    fromVersion: "1.0.0",
    toVersion: "2.0.0",
    icons: [
      { iconCode: "icon-edit-2", providerType: "lucide", providerKey: "edit-2" },
      { iconCode: "icon-github", providerType: "lucide", providerKey: "github" }
    ],
    availableKeys,
    resolveAlias: (icon) => adapter.resolveAlias({ providerKey: icon.providerKey, fromVersion: "1.0.0", toVersion: "2.0.0" }),
    canCreateSnapshot: async (icon) => Boolean(await adapter.createSnapshot({ providerKey: icon.providerKey, fromVersion: "1.0.0" })),
    getMissingReason: (icon) => adapter.getMissingReason(icon.providerKey)
  });

  assert.deepEqual(report.items.map((item) => item.type), ["renamed", "snapshot-required"]);
  assert.equal(report.items[0].nextProviderKey, "pen");
  assert.equal(report.items[1].reason, "brand-removed");
});
