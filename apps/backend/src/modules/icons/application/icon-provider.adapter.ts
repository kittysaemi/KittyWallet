export interface IconProviderOption {
  iconCode: string;
  providerType: string;
  providerKey: string;
  searchKeywords: string[];
}

export const ICON_PROVIDER_ADAPTER = Symbol("ICON_PROVIDER_ADAPTER");

export interface IconProviderAdapter {
  readonly providerType: string;
  search(keyword: string): IconProviderOption[];
  resolveByIconCode(iconCode: string): IconProviderOption | null;
  validate(providerKey: string): boolean;
}
