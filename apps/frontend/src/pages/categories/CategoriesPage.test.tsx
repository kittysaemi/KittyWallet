import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import CategoriesPage from ".";
import { categoryApi } from "../../entities/category/api/categoryApi";
import { iconApi } from "../../entities/icon/api/iconApi";

vi.mock("../../entities/category/api/categoryApi", () => ({
  categoryApi: {
    getCategories: vi.fn(),
    createCategory: vi.fn(),
    updateCategory: vi.fn()
  }
}));

vi.mock("../../entities/icon/api/iconApi", () => ({
  iconApi: {
    getIcons: vi.fn()
  }
}));

const mockedCategoryApi = vi.mocked(categoryApi);
const mockedIconApi = vi.mocked(iconApi);

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });

  const Wrapper: React.FC<React.PropsWithChildren> = ({ children }) => (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={["/categories"]}>{children}</MemoryRouter>
    </QueryClientProvider>
  );

  return Wrapper;
};

const successCategories = {
  success: true,
  data: {
    items: [
      {
        category_id: 1,
        category_name: "식비",
        icon_id: 10,
        show: true,
        is_default: true,
        editable: false,
        created_at: "2026-06-02T00:00:00Z",
        updated_at: "2026-06-02T00:00:00Z"
      },
      {
        category_id: 2,
        category_name: "반려동물",
        icon_id: 11,
        show: false,
        is_default: false,
        editable: true,
        created_at: "2026-06-02T00:00:00Z",
        updated_at: "2026-06-02T00:00:00Z"
      },
      {
        category_id: 3,
        category_name: "취미",
        icon_id: 10,
        show: true,
        is_default: false,
        editable: true,
        created_at: "2026-06-02T00:00:00Z",
        updated_at: "2026-06-02T00:00:00Z"
      }
    ]
  },
  error: null
};

const visibleIcons = {
  success: true,
  data: {
    items: [
      {
        icon_id: 10,
        icon_code: "utensils",
        provider_type: "lucide",
        provider_key: "utensils",
        show: true,
        is_default: true,
        created_at: "2026-06-02T00:00:00Z",
        updated_at: "2026-06-02T00:00:00Z"
      }
    ]
  },
  error: null
};

const hiddenIcons = {
  success: true,
  data: {
    items: [
      {
        icon_id: 11,
        icon_code: "paw-print",
        provider_type: "lucide",
        provider_key: "paw-print",
        show: false,
        is_default: false,
        created_at: "2026-06-02T00:00:00Z",
        updated_at: "2026-06-02T00:00:00Z"
      }
    ]
  },
  error: null
};

describe("CategoriesPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders category list with show state and icon-backed actions", async () => {
    mockedCategoryApi.getCategories.mockResolvedValue(successCategories);
    mockedIconApi.getIcons.mockResolvedValueOnce(visibleIcons).mockResolvedValueOnce(hiddenIcons);

    render(<CategoriesPage />, { wrapper: createWrapper() });

    expect(screen.getByLabelText("카테고리 목록을 불러오는 중입니다.")).toBeInTheDocument();
    expect(await screen.findByText("식비")).toBeInTheDocument();
    expect(screen.getByText("반려동물")).toBeInTheDocument();
    expect(screen.getByText("취미")).toBeInTheDocument();
    expect(screen.queryByText("기본")).not.toBeInTheDocument();
    expect(screen.queryByText("숨김")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "식비 숨기기" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "반려동물 표시하기" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "카테고리 등록" })).toBeEnabled();
    expect(screen.queryByRole("button", { name: "식비 이름 변경" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "반려동물 이름 변경" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "취미 이름 변경" })).toBeEnabled();
  });

  it("opens inline create form from add action", async () => {
    mockedCategoryApi.getCategories.mockResolvedValue(successCategories);
    mockedIconApi.getIcons.mockResolvedValueOnce(visibleIcons).mockResolvedValueOnce(hiddenIcons);

    render(<CategoriesPage />, { wrapper: createWrapper() });

    await userEvent.click(await screen.findByRole("button", { name: "카테고리 등록" }));
    expect(screen.getByLabelText("카테고리명")).toHaveAttribute("maxLength", "15");
    expect(screen.getByRole("button", { name: "카테고리 아이콘 선택" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "등록" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "취소" })).toBeInTheDocument();
  });

  it("closes and resets inline category create form from cancel action", async () => {
    mockedCategoryApi.getCategories.mockResolvedValue(successCategories);
    mockedIconApi.getIcons.mockResolvedValueOnce(visibleIcons).mockResolvedValueOnce(hiddenIcons);

    render(<CategoriesPage />, { wrapper: createWrapper() });

    await userEvent.click(await screen.findByRole("button", { name: "카테고리 등록" }));
    await userEvent.type(screen.getByLabelText("카테고리명"), "새카테고리");
    await userEvent.click(screen.getByRole("button", { name: "취소" }));

    expect(screen.queryByLabelText("카테고리명")).not.toBeInTheDocument();
  });

  it("edits active category name inline", async () => {
    mockedCategoryApi.getCategories.mockResolvedValue(successCategories);
    mockedCategoryApi.updateCategory.mockResolvedValue({
      success: true,
      data: { category_id: 3, show: true },
      error: null
    });
    mockedIconApi.getIcons.mockResolvedValueOnce(visibleIcons).mockResolvedValueOnce(hiddenIcons);

    render(<CategoriesPage />, { wrapper: createWrapper() });

    await userEvent.click(await screen.findByRole("button", { name: "취미 이름 변경" }));
    const input = screen.getByLabelText("취미 이름 수정");
    await userEvent.clear(input);
    await userEvent.type(input, "여가{enter}");

    await waitFor(() =>
      expect(mockedCategoryApi.updateCategory).toHaveBeenCalledWith(3, { category_name: "여가" })
    );
  });

  it("limits inline category name editing to 15 Korean characters", async () => {
    mockedCategoryApi.getCategories.mockResolvedValue(successCategories);
    mockedIconApi.getIcons
      .mockResolvedValueOnce(visibleIcons)
      .mockResolvedValueOnce(hiddenIcons)
      .mockResolvedValueOnce(visibleIcons);

    render(<CategoriesPage />, { wrapper: createWrapper() });

    await userEvent.click(await screen.findByRole("button", { name: "취미 이름 변경" }));

    expect(screen.getByLabelText("취미 이름 수정")).toHaveAttribute("maxLength", "15");
  });

  it("opens icon selection only from active editable category icon", async () => {
    mockedCategoryApi.getCategories.mockResolvedValue(successCategories);
    mockedIconApi.getIcons.mockResolvedValueOnce(visibleIcons).mockResolvedValueOnce(hiddenIcons);

    render(<CategoriesPage />, { wrapper: createWrapper() });

    expect(await screen.findByRole("button", { name: "취미 아이콘 변경" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "반려동물 아이콘 변경" })).toBeDisabled();
    await userEvent.click(screen.getByRole("button", { name: "취미 아이콘 변경" }));

    expect(screen.getByText("카테고리 아이콘 선택")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "닫기" })).toBeInTheDocument();
  });

  it("renders empty state when there are no categories", async () => {
    mockedCategoryApi.getCategories.mockResolvedValue({
      success: true,
      data: { items: [] },
      error: null
    });
    mockedIconApi.getIcons.mockResolvedValueOnce(visibleIcons).mockResolvedValueOnce(hiddenIcons);

    render(<CategoriesPage />, { wrapper: createWrapper() });

    expect(await screen.findByText("등록된 카테고리가 없습니다.")).toBeInTheDocument();
  });

  it("renders error state and retries category loading", async () => {
    mockedCategoryApi.getCategories.mockRejectedValueOnce(new Error("network"));
    mockedIconApi.getIcons.mockResolvedValueOnce(visibleIcons).mockResolvedValueOnce(hiddenIcons);

    render(<CategoriesPage />, { wrapper: createWrapper() });

    expect(await screen.findByText("카테고리 목록을 불러오지 못했습니다.")).toBeInTheDocument();

    mockedCategoryApi.getCategories.mockResolvedValueOnce(successCategories);
    mockedIconApi.getIcons.mockResolvedValueOnce(visibleIcons).mockResolvedValueOnce(hiddenIcons);

    await userEvent.click(screen.getByRole("button", { name: /다시 시도/ }));

    await waitFor(() => expect(mockedCategoryApi.getCategories).toHaveBeenCalledTimes(2));
  });
});
