import { BadRequestException, PayloadTooLargeException } from "@nestjs/common";

export class ReceiptImageRequiredException extends BadRequestException {
  constructor() {
    super({ code: "RECEIPT_IMAGE_REQUIRED", message: "영수증 이미지 한 장이 필요합니다." });
  }
}

export class ReceiptImageUnsupportedException extends BadRequestException {
  constructor() {
    super({ code: "RECEIPT_IMAGE_UNSUPPORTED", message: "지원하지 않는 영수증 이미지 형식입니다." });
  }
}

export class ReceiptImageInvalidException extends BadRequestException {
  constructor() {
    super({ code: "RECEIPT_IMAGE_INVALID", message: "분석할 수 없는 영수증 이미지입니다." });
  }
}

export class ReceiptImageTooLargeException extends PayloadTooLargeException {
  constructor() {
    super({ code: "RECEIPT_IMAGE_TOO_LARGE", message: "영수증 이미지 크기가 너무 큽니다." });
  }
}
