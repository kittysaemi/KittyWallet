import { transactionApi } from "./transactionApi";
import { apiClient } from "../../../shared/api/apiClient";

vi.mock("../../../shared/api/apiClient", () => ({
  apiClient: { get: vi.fn() }
}));

const mockedGet = vi.mocked(apiClient.get);

const item = (id: number) => ({ transaction_id: id });
const page = (ids: number[], total: number, pageNo: number) => ({
  data: {
    success: true,
    data: { items: ids.map(item), page: pageNo, limit: 100, total_count: total },
    error: null
  }
});
const range = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => from + i);

describe("transactionApi.getAllTransactions (#353)", () => {
  beforeEach(() => {
    mockedGet.mockReset();
  });

  it("total_count에 도달할 때까지 100건씩 페이지를 이어 받아 합친다", async () => {
    mockedGet
      .mockResolvedValueOnce(page(range(1, 100), 250, 1))
      .mockResolvedValueOnce(page(range(101, 200), 250, 2))
      .mockResolvedValueOnce(page(range(201, 250), 250, 3));

    const res = await transactionApi.getAllTransactions({ category_id: 1 });

    expect(res.success).toBe(true);
    expect(res.data?.items).toHaveLength(250);
    expect(res.data?.total_count).toBe(250);
    expect(mockedGet).toHaveBeenCalledTimes(3);
    expect(mockedGet.mock.calls[2][1]).toEqual({ params: { category_id: 1, page: 3, limit: 100 } });
  });

  it("결과가 100건 이하이면 한 번만 요청한다", async () => {
    mockedGet.mockResolvedValueOnce(page([1, 2], 2, 1));

    const res = await transactionApi.getAllTransactions();

    expect(res.data?.items).toHaveLength(2);
    expect(mockedGet).toHaveBeenCalledTimes(1);
  });

  it("중간 페이지가 실패하면 그 응답을 그대로 반환한다", async () => {
    const failure = { success: false, data: null, error: { code: "E", message: "fail" } };
    mockedGet.mockResolvedValueOnce(page(range(1, 100), 150, 1)).mockResolvedValueOnce({ data: failure });

    const res = await transactionApi.getAllTransactions();

    expect(res).toEqual(failure);
  });

  it("total_count보다 적게 와도 마지막 페이지가 100건 미만이면 멈춘다(무한 요청 방지)", async () => {
    mockedGet.mockResolvedValueOnce(page(range(1, 100), 300, 1)).mockResolvedValueOnce(page([101], 300, 2));

    const res = await transactionApi.getAllTransactions();

    expect(res.data?.items).toHaveLength(101);
    expect(mockedGet).toHaveBeenCalledTimes(2);
  });
});
