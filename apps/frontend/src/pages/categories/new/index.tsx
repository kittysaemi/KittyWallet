import React from "react";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { CategoryForm } from "../../../features/categories/CategoryForm";

const CategoryNewPage: React.FC = () => {
  const navigate = useNavigate();

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
            <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">카테고리 등록</h1>
            <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
              거래에 사용할 카테고리와 아이콘을 선택합니다.
            </p>
          </div>
        </header>

        <CategoryForm />
      </div>
    </div>
  );
};

export default CategoryNewPage;
