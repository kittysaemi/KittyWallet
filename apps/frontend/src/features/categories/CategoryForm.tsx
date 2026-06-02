import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AxiosError } from "axios";
import { z } from "zod";
import { categoryApi } from "../../entities/category/api/categoryApi";
import type { IconItem } from "../../entities/icon/model/icon.types";
import { Button } from "../../shared/ui/Button";
import { Input } from "../../shared/ui/Input";
import { IconSelect } from "../icons/IconSelect";

const categorySchema = z.object({
  category_name: z
    .string()
    .trim()
    .min(1, "카테고리명을 입력해주세요.")
    .max(15, "카테고리명은 한글 기준 15자 이하여야 합니다."),
  icon_id: z.number().min(1, "아이콘을 선택해주세요."),
  show: z.boolean()
});

const ERROR_MESSAGES: Record<string, string> = {
  CATEGORY_003: "이미 사용 중인 카테고리명입니다.",
  ICON_002: "선택한 아이콘을 찾을 수 없습니다.",
  VALIDATION_001: "입력값을 확인해주세요."
};

const extractFieldErrors = (error: z.ZodError): Record<string, string> => {
  const errors: Record<string, string> = {};
  error.errors.forEach((item) => {
    const key = String(item.path[0]);
    if (!errors[key]) errors[key] = item.message;
  });
  return errors;
};

export const CategoryForm: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [categoryName, setCategoryName] = useState("");
  const [selectedIconId, setSelectedIconId] = useState<number | undefined>();
  const [show, setShow] = useState(true);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);

  const invalidateCategories = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["categories", "manage"] }),
      queryClient.invalidateQueries({ queryKey: ["categories", "select"] })
    ]);
  };

  const createMutation = useMutation({
    mutationFn: categoryApi.createCategory,
    onSuccess: async () => {
      await invalidateCategories();
      navigate("/categories", { replace: true });
    },
    onError: (error: AxiosError<{ error: { code: string; message: string } }>) => {
      const code = error.response?.data?.error?.code;
      setServerError(
        (code && ERROR_MESSAGES[code]) ??
          error.response?.data?.error?.message ??
          "카테고리 등록에 실패했습니다."
      );
    }
  });

  const isPending = createMutation.isPending;

  const selectedPayload = useMemo(
    () => ({
      category_name: categoryName,
      icon_id: selectedIconId ?? 0,
      show
    }),
    [categoryName, selectedIconId, show]
  );

  const handleIconSelect = (icon: IconItem) => {
    setSelectedIconId(icon.icon_id);
    setFieldErrors((prev) => ({ ...prev, icon_id: "" }));
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setServerError(null);
    setFieldErrors({});

    const parsed = categorySchema.safeParse(selectedPayload);
    if (!parsed.success) {
      setFieldErrors(extractFieldErrors(parsed.error));
      return;
    }

    createMutation.mutate(parsed.data);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
      <Input
        label="카테고리명"
        type="text"
        name="category_name"
        value={categoryName}
        onChange={(event) => {
          setCategoryName(event.target.value);
          setFieldErrors((prev) => ({ ...prev, category_name: "" }));
        }}
        placeholder="예: 반려동물"
        error={fieldErrors.category_name}
        maxLength={15}
        disabled={isPending}
      />

      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium text-[var(--color-text-secondary)]">
          아이콘<span className="text-[var(--color-danger)]">*</span>
        </span>
        <IconSelect selectedIconId={selectedIconId} onSelect={handleIconSelect} />
        {fieldErrors.icon_id && (
          <p className="text-xs text-[var(--color-danger)]">{fieldErrors.icon_id}</p>
        )}
      </div>

      <div className="flex items-center justify-between rounded-2xl border border-[var(--color-border-primary)] bg-[var(--color-bg-card)] px-4 py-3">
        <span className="text-sm font-medium text-[var(--color-text-primary)]">카테고리 표시</span>
        <button
          type="button"
          role="switch"
          aria-checked={show}
          onClick={() => setShow((prev) => !prev)}
          disabled={isPending}
          className={`inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent p-0.5 transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
            show ? "bg-[var(--color-primary)]" : "bg-[var(--color-border-primary)]"
          }`}
        >
          <span
            className={`inline-block h-5 w-5 rounded-full bg-white shadow ring-0 transition-transform ${
              show ? "translate-x-5" : "translate-x-0"
            }`}
          />
        </button>
      </div>

      {serverError && (
        <p className="rounded-2xl border border-[var(--color-danger)] bg-[var(--color-danger-soft)] px-3 py-2 text-sm text-[var(--color-text-primary)]">
          {serverError}
        </p>
      )}

      <div className="flex gap-3">
        <Button
          type="button"
          variant="secondary"
          fullWidth
          onClick={() => navigate("/categories")}
          disabled={isPending}
        >
          취소
        </Button>
        <Button type="submit" fullWidth isLoading={isPending}>
          등록
        </Button>
      </div>
    </form>
  );
};
