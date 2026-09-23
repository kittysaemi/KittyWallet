import type { CategoryItem } from "../model/category.types";

type NamedCategory = Pick<CategoryItem, "category_name">;

/** 카테고리명 가나다순 비교 (한국어 로캘, 숫자는 자연 정렬). */
export function compareCategoryName(left: NamedCategory, right: NamedCategory): number {
  return left.category_name.localeCompare(right.category_name, "ko", { numeric: true });
}

/**
 * 카테고리 관리 화면 정렬: 기본 카테고리는 API 응답 순서(등록순) 그대로 앞에 두고,
 * 사용자 카테고리는 그 뒤에 카테고리명 가나다순으로 둔다. (카테고리정책 3. 표시 정책)
 */
export function sortCategoriesForManage<T extends NamedCategory & Pick<CategoryItem, "is_default">>(
  categories: readonly T[]
): T[] {
  const defaults = categories.filter((category) => category.is_default);
  const userCategories = categories
    .filter((category) => !category.is_default)
    .sort(compareCategoryName);
  return [...defaults, ...userCategories];
}

/**
 * 거래 등록/수정 선택 목록 정렬: 기본/사용자 구분 없이 카테고리명 가나다순.
 * (카테고리정책 3. 표시 정책)
 */
export function sortCategoriesByName<T extends NamedCategory>(categories: readonly T[]): T[] {
  return [...categories].sort(compareCategoryName);
}
