import { AxiosError, AxiosHeaders } from "axios";
import { describe, expect, it } from "vitest";
import { formatSupportError, toSupportErrorMessage } from "./apiError";

describe("api error display", () => {
  it("uses the server error code without exposing the server message", () => {
    const error = new AxiosError(
      "Request failed",
      "ERR_BAD_REQUEST",
      undefined,
      undefined,
      {
        data: { error: { code: "RECEIPT_OCR_TIMEOUT", message: "영수증 분석 시간이 초과되었습니다." } },
        status: 503,
        statusText: "Service Unavailable",
        headers: {},
        config: { headers: new AxiosHeaders() }
      }
    );

    expect(toSupportErrorMessage(error)).toBe("오류입니다 #RECEIPT_OCR_TIMEOUT 관리자에 문의하세요.");
  });

  it("uses a stable client code when no HTTP response exists", () => {
    expect(toSupportErrorMessage(new AxiosError("Network Error"))).toBe("오류입니다 #NETWORK_001 관리자에 문의하세요.");
    expect(formatSupportError("OFFLINE_001")).toBe("오류입니다 #OFFLINE_001 관리자에 문의하세요.");
  });
});
