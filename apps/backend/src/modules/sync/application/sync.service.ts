import { HttpException, Injectable } from "@nestjs/common";
import { Prisma, SyncAction, SyncResult } from "@prisma/client";
import { PrismaService } from "../../../database/prisma.service";
import { TransactionsService } from "../../transactions/application/transactions.service";

interface SyncUploadItem {
  client_temp_id: string;
  server_id?: number | null;
  sync_action: "CREATE" | "UPDATE" | "DELETE";
  payload: Record<string, unknown>;
}

interface SyncUploadCommand {
  userId: bigint;
  clientId: string;
  deviceName?: string;
  platform?: string;
  items: SyncUploadItem[];
}

export interface SyncUploadItemResult {
  client_temp_id: string;
  server_id: number | null;
  sync_action: string;
  sync_result: "SUCCESS" | "FAILED" | "CONFLICT" | "DUPLICATE_IGNORED";
  error_code?: string;
  error_message?: string;
  synced_at?: string;
  updated_at?: string;
}

export interface SyncUploadResult {
  last_synced_at: string;
  items: SyncUploadItemResult[];
}

@Injectable()
export class SyncService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly transactionsService: TransactionsService
  ) {}

  async upload(command: SyncUploadCommand): Promise<SyncUploadResult> {
    const syncClient = await this.prisma.syncClient.upsert({
      where: {
        userId_clientId: {
          userId: command.userId,
          clientId: command.clientId
        }
      },
      create: {
        userId: command.userId,
        clientId: command.clientId,
        deviceName: command.deviceName,
        platform: command.platform
      },
      update: {
        deviceName: command.deviceName,
        platform: command.platform
      }
    });

    const results: SyncUploadItemResult[] = [];

    for (const item of command.items) {
      results.push(await this.processItem(command.userId, syncClient.syncClientId, item));
    }

    const lastSyncedAt = new Date();
    await this.prisma.syncClient.update({
      where: { syncClientId: syncClient.syncClientId },
      data: { lastSyncedAt }
    });

    return {
      last_synced_at: lastSyncedAt.toISOString(),
      items: results
    };
  }

  private async processItem(
    userId: bigint,
    syncClientId: bigint,
    item: SyncUploadItem
  ): Promise<SyncUploadItemResult> {
    try {
      if (item.sync_action === "CREATE") {
        const duplicate = await this.prisma.transaction.findFirst({
          where: { userId, syncClientId, clientTempId: item.client_temp_id }
        });
        if (duplicate) {
          await this.recordHistory(userId, syncClientId, duplicate.transactionId, item, "SUCCESS");
          return {
            client_temp_id: item.client_temp_id,
            server_id: Number(duplicate.transactionId),
            sync_action: item.sync_action,
            sync_result: "DUPLICATE_IGNORED",
            synced_at: duplicate.syncedAt?.toISOString(),
            updated_at: duplicate.updatedAt.toISOString()
          };
        }
      }

      const result = await this.applyItem(userId, syncClientId, item);
      await this.recordHistory(
        userId,
        syncClientId,
        result.server_id ? BigInt(result.server_id) : null,
        item,
        "SUCCESS"
      );
      return result;
    } catch (error) {
      const failure = this.toFailure(item, error);
      await this.recordHistory(userId, syncClientId, null, item, "FAILED", failure.error_message);
      return failure;
    }
  }

  private async applyItem(
    userId: bigint,
    syncClientId: bigint,
    item: SyncUploadItem
  ): Promise<SyncUploadItemResult> {
    if (item.sync_action === "CREATE") {
      const payload = this.toCreatePayload(item.payload);
      const created = await this.transactionsService.createTransaction({
        userId,
        ...payload
      });
      const syncedAt = created.synced_at ? new Date(created.synced_at) : new Date();
      await this.prisma.transaction.update({
        where: { transactionId: BigInt(created.transaction_id) },
        data: {
          syncClientId,
          clientTempId: item.client_temp_id,
          syncedAt
        }
      });
      return {
        client_temp_id: item.client_temp_id,
        server_id: created.transaction_id,
        sync_action: item.sync_action,
        sync_result: "SUCCESS",
        synced_at: syncedAt.toISOString(),
        updated_at: created.updated_at
      };
    }

    if (!item.server_id) {
      throw new Error("server_id is required for UPDATE/DELETE sync items.");
    }

    if (item.sync_action === "UPDATE") {
      const updated = await this.transactionsService.updateTransaction({
        transactionId: BigInt(item.server_id),
        userId,
        ...this.toUpdatePayload(item.payload)
      });
      const syncedAt = new Date();
      await this.prisma.transaction.update({
        where: { transactionId: BigInt(updated.transaction_id) },
        data: { syncClientId, clientTempId: item.client_temp_id, syncedAt }
      });
      return {
        client_temp_id: item.client_temp_id,
        server_id: updated.transaction_id,
        sync_action: item.sync_action,
        sync_result: "SUCCESS",
        synced_at: syncedAt.toISOString(),
        updated_at: updated.updated_at
      };
    }

    const deleted = await this.transactionsService.deleteTransaction(BigInt(item.server_id), userId);
    const syncedAt = new Date();
    await this.prisma.transaction.update({
      where: { transactionId: BigInt(deleted.transaction_id) },
      data: { syncClientId, clientTempId: item.client_temp_id, syncedAt }
    });
    return {
      client_temp_id: item.client_temp_id,
      server_id: deleted.transaction_id,
      sync_action: item.sync_action,
      sync_result: "SUCCESS",
      synced_at: syncedAt.toISOString(),
      updated_at: deleted.updated_at
    };
  }

  private toCreatePayload(payload: Record<string, unknown>) {
    return {
      walletType: this.requiredString(payload, "wallet_type") as "ACCOUNT" | "CARD",
      walletId: BigInt(this.requiredNumber(payload, "wallet_id")),
      categoryId: BigInt(this.requiredNumber(payload, "category_id")),
      transactionType: this.requiredString(payload, "transaction_type") as "INCOME" | "EXPENSE",
      amount: this.requiredNumber(payload, "amount"),
      memo: typeof payload.memo === "string" ? payload.memo : undefined,
      transactionDate: this.requiredString(payload, "transaction_date")
    };
  }

  private toUpdatePayload(payload: Record<string, unknown>) {
    return {
      walletType: this.optionalString(payload, "wallet_type"),
      walletId: this.optionalNumber(payload, "wallet_id"),
      categoryId: this.optionalNumber(payload, "category_id"),
      transactionType: this.optionalString(payload, "transaction_type"),
      amount: this.optionalNumber(payload, "amount"),
      memo: typeof payload.memo === "string" || payload.memo === null ? payload.memo : undefined,
      transactionDate: this.optionalString(payload, "transaction_date")
    };
  }

  private requiredString(payload: Record<string, unknown>, key: string): string {
    const value = payload[key];
    if (typeof value !== "string" || value.length === 0) {
      throw new Error(`${key} is required.`);
    }
    return value;
  }

  private optionalString(payload: Record<string, unknown>, key: string): string | undefined {
    const value = payload[key];
    return typeof value === "string" && value.length > 0 ? value : undefined;
  }

  private requiredNumber(payload: Record<string, unknown>, key: string): number {
    const value = payload[key];
    if (typeof value !== "number" || !Number.isFinite(value)) {
      throw new Error(`${key} is required.`);
    }
    return value;
  }

  private optionalNumber(payload: Record<string, unknown>, key: string): number | undefined {
    const value = payload[key];
    return typeof value === "number" && Number.isFinite(value) ? value : undefined;
  }

  private toFailure(item: SyncUploadItem, error: unknown): SyncUploadItemResult {
    const response = error instanceof HttpException ? error.getResponse() : null;
    const errorBody =
      response && typeof response === "object"
        ? (response as { code?: string; message?: string })
        : undefined;
    return {
      client_temp_id: item.client_temp_id,
      server_id: item.server_id ?? null,
      sync_action: item.sync_action,
      sync_result: "FAILED",
      error_code: errorBody?.code ?? "SYNC_001",
      error_message:
        errorBody?.message ?? (error instanceof Error ? error.message : "동기화에 실패했습니다.")
    };
  }

  private recordHistory(
    userId: bigint,
    syncClientId: bigint,
    transactionId: bigint | null,
    item: SyncUploadItem,
    result: SyncResult,
    errorMessage?: string
  ): Promise<Prisma.SyncHistoryGetPayload<object>> {
    return this.prisma.syncHistory.create({
      data: {
        userId,
        syncClientId,
        transactionId,
        clientTempId: item.client_temp_id,
        syncAction: item.sync_action as SyncAction,
        syncResult: result,
        errorMessage,
        serverAppliedAt: result === "SUCCESS" ? new Date() : null
      }
    });
  }
}
