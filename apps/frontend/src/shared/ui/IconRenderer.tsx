import React from "react";
import { Circle, icons, type LucideIcon } from "lucide-react";

interface IconRendererProps {
  providerType: string;
  providerKey: string;
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

const LucideIconRenderer: React.FC<Omit<IconRendererProps, "providerType">> = ({
  providerKey,
  size = 24,
  className
}) => {
  const IconComponent = lucideIconMap[providerKey] ?? lucideIconsByName[toPascalCase(providerKey)] ?? Circle;

  return <IconComponent aria-hidden="true" className={className} size={size} strokeWidth={2} />;
};

export const IconRenderer: React.FC<IconRendererProps> = ({
  providerType,
  providerKey,
  size = 24,
  className
}) => {
  if (providerType === "lucide") {
    return <LucideIconRenderer providerKey={providerKey} size={size} className={className} />;
  }

  return <Circle aria-hidden="true" className={className} size={size} strokeWidth={2} />;
};
