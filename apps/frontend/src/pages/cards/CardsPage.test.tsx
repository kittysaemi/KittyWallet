import type { PropsWithChildren } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import CardsPage from ".";
import { cardApi } from "../../entities/card/api/cardApi";
import { iconApi } from "../../entities/icon/api/iconApi";

vi.mock("../../entities/card/api/cardApi", () => ({
  cardApi: {
    getCards: vi.fn(),
    createCard: vi.fn(),
    updateCard: vi.fn()
  }
}));

vi.mock("../../entities/icon/api/iconApi", () => ({
  iconApi: {
    getIcons: vi.fn()
  }
}));

const mockedCardApi = vi.mocked(cardApi);
const mockedIconApi = vi.mocked(iconApi);

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });

  const Wrapper = ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={["/cards"]}>{children}</MemoryRouter>
    </QueryClientProvider>
  );

  return Wrapper;
};

const successCards = {
  success: true,
  data: {
    items: [
      {
        card_id: 1,
        card_name: "생활카드",
        icon_id: 10,
        use_yn: true,
        created_at: "2026-06-02T00:00:00Z",
        updated_at: "2026-06-02T00:00:00Z"
      },
      {
        card_id: 2,
        card_name: "보관카드",
        icon_id: 11,
        use_yn: false,
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
        icon_code: "credit-card",
        provider_type: "lucide",
        provider_key: "credit-card",
        show: true,
        is_default: true,
        created_at: "2026-06-02T00:00:00Z",
        updated_at: "2026-06-02T00:00:00Z"
      },
      {
        icon_id: 11,
        icon_code: "badge-dollar-sign",
        provider_type: "lucide",
        provider_key: "badge-dollar-sign",
        show: true,
        is_default: false,
        created_at: "2026-06-02T00:00:00Z",
        updated_at: "2026-06-02T00:00:00Z"
      }
    ]
  },
  error: null
};

describe("CardsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders cards and disables editing for inactive cards", async () => {
    mockedCardApi.getCards.mockResolvedValue(successCards);
    mockedIconApi.getIcons.mockResolvedValue(visibleIcons);

    render(<CardsPage />, { wrapper: createWrapper() });

    expect(await screen.findByText("생활카드")).toBeInTheDocument();
    expect(screen.getByText("보관카드")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "생활카드 이름 변경" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "보관카드 이름 변경" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "보관카드 아이콘 변경" })).toBeDisabled();
  });

  it("opens inline create form with 15 character name limit", async () => {
    mockedCardApi.getCards.mockResolvedValue(successCards);
    mockedIconApi.getIcons.mockResolvedValue(visibleIcons);

    render(<CardsPage />, { wrapper: createWrapper() });

    await userEvent.click(await screen.findByRole("button", { name: "카드 등록" }));

    expect(screen.getByLabelText("카드명")).toHaveAttribute("maxLength", "15");
    expect(screen.getByRole("button", { name: "카드 아이콘 선택" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "등록" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "취소" })).toBeInTheDocument();
  });

  it("closes and resets inline card create form from cancel action", async () => {
    mockedCardApi.getCards.mockResolvedValue(successCards);
    mockedIconApi.getIcons.mockResolvedValue(visibleIcons);

    render(<CardsPage />, { wrapper: createWrapper() });

    await userEvent.click(await screen.findByRole("button", { name: "카드 등록" }));
    await userEvent.type(screen.getByLabelText("카드명"), "새카드");
    await userEvent.click(screen.getByRole("button", { name: "취소" }));

    expect(screen.queryByLabelText("카드명")).not.toBeInTheDocument();
  });

  it("toggles card visibility from the row area", async () => {
    mockedCardApi.getCards.mockResolvedValue(successCards);
    mockedCardApi.updateCard.mockResolvedValue({
      success: true,
      data: { card_id: 1, use_yn: false },
      error: null
    });
    mockedIconApi.getIcons.mockResolvedValue(visibleIcons);

    render(<CardsPage />, { wrapper: createWrapper() });

    await userEvent.click(await screen.findByRole("button", { name: "생활카드 비활성화" }));

    await waitFor(() =>
      expect(mockedCardApi.updateCard).toHaveBeenCalledWith(1, { use_yn: false })
    );
  });

  it("edits active card name inline and opens icon picker popup", async () => {
    mockedCardApi.getCards.mockResolvedValue(successCards);
    mockedCardApi.updateCard.mockResolvedValue({
      success: true,
      data: { card_id: 1, use_yn: true },
      error: null
    });
    mockedIconApi.getIcons.mockResolvedValue(visibleIcons);

    render(<CardsPage />, { wrapper: createWrapper() });

    await userEvent.click(await screen.findByRole("button", { name: "생활카드 이름 변경" }));
    const input = screen.getByLabelText("생활카드 이름 수정");
    await userEvent.clear(input);
    await userEvent.type(input, "교통카드{enter}");

    await waitFor(() =>
      expect(mockedCardApi.updateCard).toHaveBeenCalledWith(1, { card_name: "교통카드" })
    );

    await userEvent.click(screen.getByRole("button", { name: "생활카드 아이콘 변경" }));
    expect(screen.getByText("카드 아이콘 선택")).toBeInTheDocument();
  });
});
