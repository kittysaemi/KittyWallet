import React from "react";
import { Circle, icons, type LucideIcon } from "lucide-react";

interface IconRendererProps {
  providerType: string;
  providerKey: string;
  snapshot?: { snapshot_format: string; snapshot_payload: string } | null;
  size?: number;
  className?: string;
}

const toKebabCase = (value: string): string =>
  value
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/([A-Z])([A-Z][a-z])/g, "$1-$2")
    .toLowerCase();

const toPascalCase = (value: string): string =>
  value
    .split("-")
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join("");

const lucideIconsByName = icons as Record<string, LucideIcon>;
const lucideIconMap = Object.entries(icons).reduce<Record<string, LucideIcon>>(
  (iconMap, [componentName, IconComponent]) => {
    iconMap[toKebabCase(componentName)] = IconComponent;
    return iconMap;
  },
  {}
);

export const IconRenderer: React.FC<IconRendererProps> = ({
  providerType,
  providerKey,
  snapshot,
  size = 24,
  className
}) => {
  const fallback = <Circle aria-hidden="true" className={className} size={size} strokeWidth={2} />;
  if (providerType === "lucide") {
    const IconComponent = lucideIconMap[providerKey] ?? lucideIconsByName[toPascalCase(providerKey)];
    if (IconComponent) return <IconComponent aria-hidden="true" className={className} size={size} strokeWidth={2} />;

    if (snapshot?.snapshot_format === "svg" && isSafeSvg(snapshot.snapshot_payload)) {
      return <span aria-hidden="true" className={className} style={{ width: size, height: size, display: "inline-block" }} dangerouslySetInnerHTML={{ __html: snapshot.snapshot_payload }} />;
    }
  }
  return fallback;
};

function isSafeSvg(payload: string): boolean {
  return /^\s*<svg\b/i.test(payload) && !/<\/?script\b|\bon\w+\s*=|javascript:|<\/?foreignObject\b/i.test(payload);
}
