import { sortCategoriesByName, sortCategoriesForManage } from "./sortCategories";

const make = (category_id: number, category_name: string, is_default: boolean) => ({
  category_id,
  category_name,
  is_default
});

// API 응답 순서(categoryId 오름차순, 등록순)를 흉내낸 목록
const CATEGORIES = [
  make(1, "급여", true),
  make(2, "식비", true),
  make(3, "기타지출", true),
  make(20, "하늘", false),
  make(21, "가게", false),
  make(22, "Netflix", false),
  make(23, "나들이", false)
];

const names = (items: { category_name: string }[]) => items.map((item) => item.category_name);

describe("sortCategoriesForManage (#353)", () => {
  it("기본 카테고리는 등록순 그대로 앞에 두고, 사용자 카테고리만 그 뒤에 가나다순으로 둔다", () => {
    expect(names(sortCategoriesForManage(CATEGORIES))).toEqual([
      "급여",
      "식비",
      "기타지출",
      "가게",
      "나들이",
      "하늘",
      "Netflix"
    ]);
  });

  it("원본 배열을 변경하지 않는다", () => {
    const original = [...CATEGORIES];
    sortCategoriesForManage(CATEGORIES);
    expect(CATEGORIES).toEqual(original);
  });
});

describe("sortCategoriesByName (#353)", () => {
  it("기본/사용자 구분 없이 전체를 가나다순으로 정렬한다(한국어 로캘: 한글 다음 영문)", () => {
    expect(names(sortCategoriesByName(CATEGORIES))).toEqual([
      "가게",
      "급여",
      "기타지출",
      "나들이",
      "식비",
      "하늘",
      "Netflix"
    ]);
  });

  it("숫자가 포함된 이름은 자연 정렬한다", () => {
    const items = [make(1, "적금10", false), make(2, "적금2", false), make(3, "적금1", false)];
    expect(names(sortCategoriesByName(items))).toEqual(["적금1", "적금2", "적금10"]);
  });

  it("원본 배열을 변경하지 않는다", () => {
    const original = [...CATEGORIES];
    sortCategoriesByName(CATEGORIES);
    expect(CATEGORIES).toEqual(original);
  });
});
