import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AxiosError } from "axios";
import { z } from "zod";
import { accountApi } from "../../entities/account/api/accountApi";
import { invalidateAccountCaches } from "../../pwa/cache/cacheInvalidation";
import type { AccountItem } from "../../entities/account/model/account.types";
import type { IconItem } from "../../entities/icon/model/icon.types";
import { IconSelect } from "../icons/IconSelect";
import { Button } from "../../shared/ui/Button";
import { Input } from "../../shared/ui/Input";

const createSchema = z.object({
  account_name: z
    .string()
    .min(1, "계좌명을 입력해주세요.")
    .max(15, "계좌명은 한글 기준 15자 이하여야 합니다."),
  initial_balance: z
    .number({ invalid_type_error: "금액을 입력해주세요." })
    .int("정수를 입력해주세요.")
    .min(0, "초기 잔액은 0 이상이어야 합니다."),
  icon_id: z.number().min(1, "아이콘을 선택해주세요.")
});

const editSchema = z.object({
  account_name: z
    .string()
    .min(1, "계좌명을 입력해주세요.")
    .max(15, "계좌명은 한글 기준 15자 이하여야 합니다.")
    .optional(),
  icon_id: z.number().min(1, "아이콘을 선택해주세요.").optional()
});

interface AccountFormProps {
  mode: "create" | "edit";
  account?: AccountItem;
}

const ERROR_MESSAGES: Record<string, string> = {
  ACCOUNT_001: "이미 사용 중인 계좌명입니다.",
  ACCOUNT_002: "계좌를 찾을 수 없습니다.",
  ICON_002: "선택한 아이콘을 찾을 수 없습니다.",
  VALIDATION_001: "입력값을 확인해주세요."
};

export const AccountForm: React.FC<AccountFormProps> = ({ mode, account }) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isEdit = mode === "edit";

  const [accountName, setAccountName] = useState(account?.account_name ?? "");
  const [initialBalance, setInitialBalance] = useState(
    account?.initial_balance !== undefined ? String(account.initial_balance) : ""
  );
  const [selectedIconId, setSelectedIconId] = useState<number | undefined>(account?.icon_id);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: accountApi.createAccount,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["accounts"] });
      navigate("/accounts", { replace: true });
    },
    onError: (error: AxiosError<{ error: { code: string; message: string } }>) => {
      const code = error.response?.data?.error?.code;
      setServerError(
        (code && ERROR_MESSAGES[code]) ??
          error.response?.data?.error?.message ??
          "계좌 등록에 실패했습니다."
      );
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      data
    }: {
      id: number;
      data: Parameters<typeof accountApi.updateAccount>[1];
    }) => accountApi.updateAccount(id, data),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["accounts"] });
      void invalidateAccountCaches();
      navigate("/accounts", { replace: true });
    },
    onError: (error: AxiosError<{ error: { code: string; message: string } }>) => {
      const code = error.response?.data?.error?.code;
      setServerError(
        (code && ERROR_MESSAGES[code]) ??
          error.response?.data?.error?.message ??
          "계좌 수정에 실패했습니다."
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

    if (isEdit && account) {
      const parsed = editSchema.safeParse({
        account_name: accountName || undefined,
        icon_id: selectedIconId
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
      updateMutation.mutate({ id: account.account_id, data: parsed.data });
    } else {
      const balanceNum = Number(initialBalance);
      const parsed = createSchema.safeParse({
        account_name: accountName,
        initial_balance: isNaN(balanceNum) ? undefined : balanceNum,
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
        label="계좌명"
        type="text"
        name="account_name"
        value={accountName}
        onChange={(e) => {
          setAccountName(e.target.value);
          setFieldErrors((prev) => ({ ...prev, account_name: "" }));
        }}
        placeholder="예: 생활비 통장"
        error={fieldErrors.account_name}
        maxLength={15}
      />

      {!isEdit && (
        <Input
          label="초기 잔액"
          type="text"
          inputMode="numeric"
          name="initial_balance"
          value={initialBalance ? Number(initialBalance).toLocaleString() : ""}
          onChange={(e) => {
            const raw = e.target.value.replace(/,/g, "").replace(/[^0-9]/g, "");
            setInitialBalance(raw);
            setFieldErrors((prev) => ({ ...prev, initial_balance: "" }));
          }}
          onKeyDown={(e) => {
            if (e.key === "." || e.key === ",") e.preventDefault();
          }}
          placeholder="0"
          error={fieldErrors.initial_balance}
        />
      )}

      {isEdit && account && (
        <div className="flex flex-col gap-1">
          <span className="text-sm font-medium text-[var(--color-text-secondary)]">현재 잔액</span>
          <p className="min-h-11 rounded-xl border border-[var(--color-border-primary)] bg-[var(--color-bg-secondary)] px-3 py-2 text-sm text-[var(--color-text-primary)]">
            {(account.current_balance ?? account.initial_balance).toLocaleString()}원
          </p>
          <p className="text-xs text-[var(--color-text-caption)]">
            잔액은 거래 기준으로 자동 계산됩니다.
          </p>
        </div>
      )}

      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium text-[var(--color-text-secondary)]">
          아이콘 <span className="text-[var(--color-danger)]">*</span>
        </span>
        <IconSelect selectedIconId={selectedIconId} onSelect={handleIconSelect} />
        {fieldErrors.icon_id && (
          <p className="text-xs text-[var(--color-danger)]">{fieldErrors.icon_id}</p>
        )}
      </div>

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
          onClick={() => navigate("/accounts")}
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
