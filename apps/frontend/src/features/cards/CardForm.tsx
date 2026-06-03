import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AxiosError } from "axios";
import { z } from "zod";
import { cardApi } from "../../entities/card/api/cardApi";
import type { CardItem } from "../../entities/card/model/card.types";
import type { IconItem } from "../../entities/icon/model/icon.types";
import { IconSelect } from "../icons/IconSelect";
import { Button } from "../../shared/ui/Button";
import { Input } from "../../shared/ui/Input";

const createSchema = z.object({
  card_name: z
    .string()
    .min(1, "카드명을 입력해주세요.")
    .max(15, "카드명은 한글 기준 15자 이하여야 합니다."),
  icon_id: z.number().min(1, "아이콘을 선택해주세요.")
});

const editSchema = z.object({
  card_name: z
    .string()
    .min(1, "카드명을 입력해주세요.")
    .max(15, "카드명은 한글 기준 15자 이하여야 합니다.")
    .optional(),
  icon_id: z.number().min(1).optional(),
  use_yn: z.boolean().optional()
});

const ERROR_MESSAGES: Record<string, string> = {
  CARD_003: "이미 사용 중인 카드명입니다.",
  CARD_002: "카드를 찾을 수 없습니다.",
  ICON_002: "선택한 아이콘을 찾을 수 없습니다.",
  VALIDATION_001: "입력값을 확인해주세요."
};

interface CardFormProps {
  mode: "create" | "edit";
  card?: CardItem;
}

export const CardForm: React.FC<CardFormProps> = ({ mode, card }) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isEdit = mode === "edit";

  const [cardName, setCardName] = useState(card?.card_name ?? "");
  const [selectedIconId, setSelectedIconId] = useState<number | undefined>(card?.icon_id);
  const [useYn, setUseYn] = useState(card?.use_yn ?? true);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: cardApi.createCard,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["cards"] });
      navigate("/cards", { replace: true });
    },
    onError: (error: AxiosError<{ error: { code: string; message: string } }>) => {
      const code = error.response?.data?.error?.code;
      setServerError(
        (code && ERROR_MESSAGES[code]) ??
          error.response?.data?.error?.message ??
          "카드 등록에 실패했습니다."
      );
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Parameters<typeof cardApi.updateCard>[1] }) =>
      cardApi.updateCard(id, data),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["cards"] });
      navigate("/cards", { replace: true });
    },
    onError: (error: AxiosError<{ error: { code: string; message: string } }>) => {
      const code = error.response?.data?.error?.code;
      setServerError(
        (code && ERROR_MESSAGES[code]) ??
          error.response?.data?.error?.message ??
          "카드 수정에 실패했습니다."
      );
    }
  });

  const isPending = createMutation.isPending || updateMutation.isPending;

  const handleIconSelect = (icon: IconItem) => {
    setSelectedIconId(icon.icon_id);
    setFieldErrors((prev) => ({ ...prev, icon_id: "" }));
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setServerError(null);
    setFieldErrors({});

    if (isEdit && card) {
      const parsed = editSchema.safeParse({
        card_name: cardName || undefined,
        icon_id: selectedIconId,
        use_yn: useYn
      });
      if (!parsed.success) {
        const errors: Record<string, string> = {};
        parsed.error.errors.forEach((e) => {
          const key = String(e.path[0]);
          if (!errors[key]) errors[key] = e.message;
        });
        setFieldErrors(errors);
        return;
      }
      updateMutation.mutate({ id: card.card_id, data: parsed.data });
    } else {
      const parsed = createSchema.safeParse({
        card_name: cardName,
        icon_id: selectedIconId ?? 0
      });
      if (!parsed.success) {
        const errors: Record<string, string> = {};
        parsed.error.errors.forEach((e) => {
          const key = String(e.path[0]);
          if (!errors[key]) errors[key] = e.message;
        });
        setFieldErrors(errors);
        return;
      }
      createMutation.mutate(parsed.data);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
      <Input
        label="카드명"
        type="text"
        name="card_name"
        value={cardName}
        onChange={(e) => {
          setCardName(e.target.value);
          setFieldErrors((prev) => ({ ...prev, card_name: "" }));
        }}
        placeholder="예: 신한카드"
        error={fieldErrors.card_name}
        maxLength={15}
      />

      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium text-[var(--color-text-secondary)]">
          아이콘 <span className="text-[var(--color-danger)]">*</span>
        </span>
        <IconSelect selectedIconId={selectedIconId} onSelect={handleIconSelect} />
        {fieldErrors.icon_id && (
          <p className="text-xs text-[var(--color-danger)]">{fieldErrors.icon_id}</p>
        )}
      </div>

      {isEdit && (
        <div className="flex items-center justify-between rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-card)] px-4 py-3">
          <span className="text-sm font-medium text-[var(--color-text-primary)]">카드 사용</span>
          <button
            type="button"
            role="switch"
            aria-checked={useYn}
            onClick={() => setUseYn((prev) => !prev)}
            className={`inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent p-0.5 transition-colors ${
              useYn ? "bg-[var(--color-primary)]" : "bg-[var(--color-border-primary)]"
            }`}
          >
            <span
              className={`inline-block h-5 w-5 rounded-full bg-white shadow ring-0 transition-transform ${
                useYn ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>
      )}

      {serverError && (
        <p className="rounded-xl border border-[var(--color-danger)] bg-[var(--color-danger-soft)] px-3 py-2 text-sm text-[var(--color-text-primary)]">
          {serverError}
        </p>
      )}

      <div className="flex gap-3">
        <Button
          type="button"
          variant="secondary"
          fullWidth
          onClick={() => navigate("/cards")}
          disabled={isPending}
        >
          취소
        </Button>
        <Button type="submit" fullWidth isLoading={isPending}>
          {isEdit ? "수정" : "등록"}
        </Button>
      </div>
    </form>
  );
};
