import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CategoriesPage from ".";
import { categoryApi } from "../../entities/category/api/categoryApi";
import { iconApi } from "../../entities/icon/api/iconApi";

vi.mock("../../entities/category/api/categoryApi", () => ({
  categoryApi: {
    getCategories: vi.fn(),
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
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
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
    expect(screen.getByText("기본")).toBeInTheDocument();
    expect(screen.queryByText("숨김")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "식비 숨기기" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "반려동물 표시하기" })).toBeInTheDocument();
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
