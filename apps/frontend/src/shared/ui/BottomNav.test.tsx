import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BottomNav } from "./BottomNav";

const { mockCameraIsAvailable, mockCameraAcquire, mockGalleryAcquire } = vi.hoisted(() => ({
  mockCameraIsAvailable: vi.fn().mockResolvedValue(false),
  mockCameraAcquire: vi.fn(),
  mockGalleryAcquire: vi.fn(),
}));

vi.mock("../receipt/receiptImageSource", () => ({
  WebCameraReceiptImageSource: class {
    readonly id = "web-camera";
    isAvailable = mockCameraIsAvailable;
    acquire = mockCameraAcquire;
  },
  FilePickerReceiptImageSource: class {
    readonly id = "file-picker";
    isAvailable = vi.fn().mockResolvedValue(true);
    acquire = mockGalleryAcquire;
  },
}));

const renderBottomNav = (path = "/dashboard") =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <BottomNav />
    </MemoryRouter>
  );

describe("BottomNav", () => {
  beforeEach(() => {
    mockCameraIsAvailable.mockResolvedValue(false);
    mockCameraAcquire.mockReset();
    mockGalleryAcquire.mockReset();
  });

  describe("접근성", () => {
    it("+ 버튼에 aria-label이 있다", () => {
      renderBottomNav();
      expect(screen.getByRole("button", { name: "거래 등록 방식 선택" })).toBeInTheDocument();
    });

    it("시트의 닫기 버튼에 aria-label이 있다", () => {
      renderBottomNav();
      fireEvent.click(screen.getByRole("button", { name: "거래 등록 방식 선택" }));
      expect(screen.getByRole("button", { name: "닫기" })).toBeInTheDocument();
    });

    it("시트는 role=dialog와 aria-modal을 가진다", () => {
      renderBottomNav();
      fireEvent.click(screen.getByRole("button", { name: "거래 등록 방식 선택" }));
      expect(screen.getByRole("dialog")).toHaveAttribute("aria-modal", "true");
    });
  });

  describe("등록 방식 선택 시트", () => {
    it("+ 클릭 시 시트가 열린다", () => {
      renderBottomNav();
      fireEvent.click(screen.getByRole("button", { name: "거래 등록 방식 선택" }));
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    it("시트에 직접 입력과 사진 입력이 항상 표시된다", () => {
      renderBottomNav();
      fireEvent.click(screen.getByRole("button", { name: "거래 등록 방식 선택" }));
      expect(screen.getByText("직접 입력")).toBeInTheDocument();
      expect(screen.getByText("사진 입력")).toBeInTheDocument();
    });

    it("카메라 미지원 시 카메라 입력이 표시되지 않는다", async () => {
      mockCameraIsAvailable.mockResolvedValue(false);
      renderBottomNav();
      fireEvent.click(screen.getByRole("button", { name: "거래 등록 방식 선택" }));
      await waitFor(() => {
        expect(screen.queryByText("카메라 입력")).not.toBeInTheDocument();
      });
    });

    it("카메라 지원 시 카메라 입력이 표시된다", async () => {
      mockCameraIsAvailable.mockResolvedValue(true);
      renderBottomNav();
      fireEvent.click(screen.getByRole("button", { name: "거래 등록 방식 선택" }));
      await waitFor(() => {
        expect(screen.getByText("카메라 입력")).toBeInTheDocument();
      });
    });

    it("닫기 클릭 시 시트가 닫힌다", () => {
      renderBottomNav();
      fireEvent.click(screen.getByRole("button", { name: "거래 등록 방식 선택" }));
      expect(screen.getByRole("dialog")).toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: "닫기" }));
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("취소 버튼 클릭 시 시트가 닫힌다", () => {
      renderBottomNav();
      fireEvent.click(screen.getByRole("button", { name: "거래 등록 방식 선택" }));
      fireEvent.click(screen.getByRole("button", { name: "취소" }));
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  describe("사진 입력 어댑터 연동", () => {
    it("사진 입력 클릭 시 filePickerSource.acquire()를 호출한다", async () => {
      mockGalleryAcquire.mockRejectedValue(Object.assign(new Error(), { code: "CANCELLED" }));
      renderBottomNav();
      fireEvent.click(screen.getByRole("button", { name: "거래 등록 방식 선택" }));
      fireEvent.click(screen.getByText("사진 입력"));
      await waitFor(() => expect(mockGalleryAcquire).toHaveBeenCalledOnce());
    });

    it("카메라 입력 클릭 시 webCameraSource.acquire()를 호출한다", async () => {
      mockCameraIsAvailable.mockResolvedValue(true);
      mockCameraAcquire.mockRejectedValue(Object.assign(new Error(), { code: "CANCELLED" }));
      renderBottomNav();
      fireEvent.click(screen.getByRole("button", { name: "거래 등록 방식 선택" }));
      await waitFor(() => expect(screen.getByText("카메라 입력")).toBeInTheDocument());
      fireEvent.click(screen.getByText("카메라 입력"));
      await waitFor(() => expect(mockCameraAcquire).toHaveBeenCalledOnce());
    });

    it("acquire() 취소 시 시트가 열린 채로 유지된다", async () => {
      mockGalleryAcquire.mockRejectedValue(Object.assign(new Error(), { code: "CANCELLED" }));
      renderBottomNav();
      fireEvent.click(screen.getByRole("button", { name: "거래 등록 방식 선택" }));
      fireEvent.click(screen.getByText("사진 입력"));
      await waitFor(() => expect(mockGalleryAcquire).toHaveBeenCalled());
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });
  });

  describe("하단 네비게이션", () => {
    it("홈, 검색, 통계, 관리 링크가 렌더링된다", () => {
      renderBottomNav();
      expect(screen.getByText("홈")).toBeInTheDocument();
      expect(screen.getByText("검색")).toBeInTheDocument();
      expect(screen.getByText("통계")).toBeInTheDocument();
      expect(screen.getByText("관리")).toBeInTheDocument();
    });
  });
});
