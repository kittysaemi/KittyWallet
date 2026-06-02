import React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, RotateCw } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { categoryApi } from "../../../entities/category/api/categoryApi";
import type { CategoryItem } from "../../../entities/category/model/category.types";
import type { IconItem } from "../../../entities/icon/model/icon.types";
import { IconSelect } from "../../../features/icons/IconSelect";
import { Button } from "../../../shared/ui/Button";

const canEditIcon = (category: CategoryItem) => category.editable && category.show;

const CategoryIconSelectPage: React.FC = () => {
  const navigate = useNavigate();
  const params = useParams();
  const queryClient = useQueryClient();
  const categoryId = Number(params.id);

  const categoriesQuery = useQuery({
    queryKey: ["categories", "manage"],
    queryFn: () => categoryApi.getCategories()
  });

  const categories = categoriesQuery.data?.data?.items ?? [];
  const category = categories.find((item) => item.category_id === categoryId);
  const isInvalidId = Number.isNaN(categoryId) || categoryId < 1;
  const isError =
    categoriesQuery.isError || (categoriesQuery.data && !categoriesQuery.data.success);

  const updateMutation = useMutation({
    mutationFn: (icon: IconItem) =>
      categoryApi.updateCategory(categoryId, { icon_id: icon.icon_id }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["categories", "manage"] }),
        queryClient.invalidateQueries({ queryKey: ["categories", "select"] })
      ]);
      navigate("/categories", { replace: true });
    }
  });

  const handleSelect = (icon: IconItem) => {
    if (!category || !canEditIcon(category) || updateMutation.isPending) return;
    updateMutation.mutate(icon);
  };

  return (
    <div className="min-h-screen bg-[var(--color-bg-primary)] px-4 py-6">
      <div className="mx-auto flex w-full max-w-[480px] flex-col gap-5">
        <header className="flex items-center gap-3">
          <button
            type="button"
            aria-label="뒤로 가기"
            onClick={() => navigate("/categories")}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)]"
          >
            <ArrowLeft size={20} aria-hidden="true" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">아이콘 선택</h1>
            <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
              선택하면 카테고리 관리 화면으로 돌아갑니다.
            </p>
          </div>
        </header>

        {categoriesQuery.isLoading && (
          <div
            className="rounded-2xl border border-[var(--color-border-primary)] bg-[var(--color-bg-card)] p-4 text-sm text-[var(--color-text-secondary)]"
            aria-label="카테고리 정보를 불러오는 중입니다."
          >
            로딩 중...
          </div>
        )}

        {!categoriesQuery.isLoading && isError && (
          <div className="rounded-2xl border border-[var(--color-danger)] bg-[var(--color-danger-soft)] p-4">
            <p className="text-sm font-semibold text-[var(--color-text-primary)]">
              카테고리 정보를 불러오지 못했습니다.
            </p>
            <Button
              type="button"
              variant="secondary"
              className="mt-3"
              onClick={() => void categoriesQuery.refetch()}
            >
              <span className="inline-flex items-center gap-2">
                <RotateCw size={16} aria-hidden="true" />
                다시 시도
              </span>
            </Button>
          </div>
        )}

        {!categoriesQuery.isLoading && !isError && (isInvalidId || !category) && (
          <div className="rounded-2xl border border-[var(--color-border-primary)] bg-[var(--color-bg-card)] p-4">
            <p className="text-sm font-semibold text-[var(--color-text-primary)]">
              카테고리를 찾을 수 없습니다.
            </p>
            <Button
              type="button"
              variant="secondary"
              className="mt-3"
              onClick={() => navigate("/categories")}
            >
              목록으로 돌아가기
            </Button>
          </div>
        )}

        {!categoriesQuery.isLoading && !isError && category && !canEditIcon(category) && (
          <div className="rounded-2xl border border-[var(--color-border-primary)] bg-[var(--color-bg-card)] p-4">
            <p className="text-sm font-semibold text-[var(--color-text-primary)]">
              이 카테고리는 아이콘을 변경할 수 없습니다.
            </p>
            <Button
              type="button"
              variant="secondary"
              className="mt-3"
              onClick={() => navigate("/categories")}
            >
              목록으로 돌아가기
            </Button>
          </div>
        )}

        {!categoriesQuery.isLoading && !isError && category && canEditIcon(category) && (
          <div className="flex flex-col gap-3">
            <p className="text-sm font-semibold text-[var(--color-text-primary)]">
              {category.category_name}
            </p>
            <IconSelect selectedIconId={category.icon_id} onSelect={handleSelect} />
            {updateMutation.isError && (
              <p className="rounded-2xl border border-[var(--color-danger)] bg-[var(--color-danger-soft)] p-3 text-sm text-[var(--color-text-primary)]">
                아이콘을 변경하지 못했습니다. 다시 시도해주세요.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CategoryIconSelectPage;
