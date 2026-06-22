export type ReceiptImageSourceKind = "camera" | "gallery";

export interface ReceiptImageSource {
  readonly kind: ReceiptImageSourceKind;
  isAvailable(): Promise<boolean>;
}
