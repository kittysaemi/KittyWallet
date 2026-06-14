import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StatisticsExcludeSheet } from "./StatisticsExcludeSheet";
import type { CategoryItem } from "../../entities/category/model/category.types";

const makeCategory = (overrides: Partial<CategoryItem> = {}): CategoryItem => ({
  category_id: 1,
  category_name: "식비",
  icon_id: 10,
  show: true,
  is_default: true,
  editable: false,
  include_in_statistics: true,
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
  ...overrides
});

const defaultProps = {
  isOpen: true,
  categories: [
    makeCategory({ category_id: 1, category_name: "식비", include_in_statistics: true }),
    makeCategory({ category_id: 2, category_name: "업무비", include_in_statistics: false, is_default: false, editable: true })
  ],
  disabled: false,
  onClose: vi.fn(),
  onToggle: vi.fn()
};

describe("StatisticsExcludeSheet", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders nothing when closed", () => {
    render(<StatisticsExcludeSheet {...defaultProps} isOpen={false} />);
    expect(screen.queryByText("통계 제외 관리")).not.toBeInTheDocument();
  });

  it("renders title, description, and category list when open", () => {
    render(<StatisticsExcludeSheet {...defaultProps} />);
    expect(screen.getByText("통계 제외 관리")).toBeInTheDocument();
    expect(screen.getByText("거래 내역과 잔액은 유지되고 통계 합계에서만 제외됩니다.")).toBeInTheDocument();
    expect(screen.getByLabelText("통계 제외 카테고리 목록")).toBeInTheDocument();
    expect(screen.getByLabelText("식비 통계 제외하기")).toBeInTheDocument();
    expect(screen.getByLabelText("업무비 통계 포함하기")).toBeInTheDocument();
  });

  it("shows 통계 제외 badge only for excluded categories", () => {
    render(<StatisticsExcludeSheet {...defaultProps} />);
    const badges = screen.getAllByText("통계 제외");
    expect(badges).toHaveLength(1);
    expect(screen.getByLabelText("업무비 통계 포함하기")).toContainElement(badges[0]);
  });

  it("calls onToggle with the clicked category", async () => {
    render(<StatisticsExcludeSheet {...defaultProps} />);
    await userEvent.click(screen.getByLabelText("식비 통계 제외하기"));
    expect(defaultProps.onToggle).toHaveBeenCalledWith(defaultProps.categories[0]);
  });

  it("calls onToggle for excluded category to re-include it", async () => {
    render(<StatisticsExcludeSheet {...defaultProps} />);
    await userEvent.click(screen.getByLabelText("업무비 통계 포함하기"));
    expect(defaultProps.onToggle).toHaveBeenCalledWith(defaultProps.categories[1]);
  });

  it("calls onClose when close button is clicked", async () => {
    render(<StatisticsExcludeSheet {...defaultProps} />);
    await userEvent.click(screen.getByRole("button", { name: "닫기" }));
    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });

  it("disables all category buttons when disabled prop is true", () => {
    render(<StatisticsExcludeSheet {...defaultProps} disabled={true} />);
    expect(screen.getByLabelText("식비 통계 제외하기")).toBeDisabled();
    expect(screen.getByLabelText("업무비 통계 포함하기")).toBeDisabled();
  });

  it("renders category initial letter when icon is not provided", () => {
    const categories = [makeCategory({ category_id: 1, category_name: "식비", icon: undefined })];
    render(<StatisticsExcludeSheet {...defaultProps} categories={categories} />);
    expect(screen.getByText("식")).toBeInTheDocument();
  });

  it("renders empty list when no categories are provided", () => {
    render(<StatisticsExcludeSheet {...defaultProps} categories={[]} />);
    expect(screen.getByLabelText("통계 제외 카테고리 목록")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /통계/ })).not.toBeInTheDocument();
  });
});
