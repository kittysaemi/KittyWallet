import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { CategoryForm } from "./CategoryForm";
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

const iconsResponse = {
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
      },
      {
        icon_id: 11,
        icon_code: "paw-print",
        provider_type: "lucide",
        provider_key: "paw-print",
        show: true,
        is_default: false,
        created_at: "2026-06-02T00:00:00Z",
        updated_at: "2026-06-02T00:00:00Z"
      }
    ]
  },
  error: null
};

const renderForm = (element: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={["/categories/new"]}>
        <Routes>
          <Route path="/categories/new" element={element} />
          <Route path="/categories" element={<div>카테고리 목록 화면</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
};

describe("CategoryForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedIconApi.getIcons.mockResolvedValue(iconsResponse);
  });

  it("selects an icon and moves to list after create success", async () => {
    mockedCategoryApi.createCategory.mockResolvedValue({
      success: true,
      data: { category_id: 20 },
      error: null
    });

    renderForm(<CategoryForm />);

    await userEvent.type(screen.getByLabelText("카테고리명"), "취미");
    await userEvent.click(await screen.findByRole("button", { name: "아이콘 선택: paw-print" }));
    expect(screen.getByRole("button", { name: "아이콘 선택: paw-print" })).toHaveAttribute(
      "aria-pressed",
      "true"
    );

    await userEvent.click(screen.getByRole("button", { name: "등록" }));

    await waitFor(() =>
      expect(mockedCategoryApi.createCategory).toHaveBeenCalledWith(
        {
          category_name: "취미",
          icon_id: 11,
          show: true
        },
        expect.anything()
      )
    );
    expect(await screen.findByText("카테고리 목록 화면")).toBeInTheDocument();
  });

  it("shows validation messages for missing name and icon", async () => {
    renderForm(<CategoryForm />);

    await screen.findByLabelText("카테고리명");
    await userEvent.click(screen.getByRole("button", { name: "등록" }));

    expect(screen.getByText("카테고리명을 입력해주세요.")).toBeInTheDocument();
    expect(screen.getByText("아이콘을 선택해주세요.")).toBeInTheDocument();
    expect(mockedCategoryApi.createCategory).not.toHaveBeenCalled();
  });

  it("limits category name to 15 Korean characters", async () => {
    renderForm(<CategoryForm />);

    const nameInput = await screen.findByLabelText("카테고리명");
    expect(nameInput).toHaveAttribute("maxLength", "15");
  });
});
