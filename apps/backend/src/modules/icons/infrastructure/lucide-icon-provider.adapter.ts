import { Injectable } from "@nestjs/common";
import * as lucideStatic from "lucide-static";
import { IconProviderAdapter, IconProviderOption } from "../application/icon-provider.adapter";

const toKebabCase = (value: string): string =>
  value
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/([A-Z])([A-Z][a-z])/g, "$1-$2")
    .toLowerCase();

const toIconCode = (providerKey: string): string => `icon-${providerKey}`;

@Injectable()
export class LucideIconProviderAdapter implements IconProviderAdapter {
  readonly providerType = "lucide";

  private readonly providerKeys = Object.keys(lucideStatic)
    .filter((exportName) => typeof (lucideStatic as Record<string, unknown>)[exportName] === "string")
    .map(toKebabCase)
    .sort();

  private readonly providerKeySet = new Set(this.providerKeys);

  search(keyword: string): IconProviderOption[] {
    const normalizedKeyword = keyword.trim().toLowerCase();
    if (!normalizedKeyword) return [];

    return this.providerKeys
      .filter((providerKey) => providerKey.includes(normalizedKeyword))
      .slice(0, 24)
      .map((providerKey) => this.toOption(providerKey));
  }

  resolveByIconCode(iconCode: string): IconProviderOption | null {
    if (!iconCode.startsWith("icon-")) return null;

    const providerKey = iconCode.slice("icon-".length);
    if (!this.validate(providerKey)) return null;

    return this.toOption(providerKey);
  }

  validate(providerKey: string): boolean {
    return this.providerKeySet.has(providerKey);
  }

  private toOption(providerKey: string): IconProviderOption {
    return {
      iconCode: toIconCode(providerKey),
      providerType: this.providerType,
      providerKey,
      searchKeywords: [providerKey]
    };
  }
}
