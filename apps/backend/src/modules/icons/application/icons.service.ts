import { HttpStatus, Inject, Injectable } from "@nestjs/common";
import { IconDictionary } from "@prisma/client";
import { AppException } from "../../../common/exceptions/app.exception";
import {
  ICON_PROVIDER_ADAPTER,
  IconProviderAdapter,
  IconProviderOption
} from "./icon-provider.adapter";
import { IconsRepository, IconWithDictionary } from "../infrastructure/icons.repository";

export interface IconItem {
  icon_id: number;
  icon_code: string;
  provider_type: string;
  provider_key: string;
  snapshot: { snapshot_hash: string; snapshot_format: string; snapshot_payload: string } | null;
  show: boolean;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface IconOptionItem {
  icon_code: string;
  provider_type: string;
  provider_key: string;
}

export interface IconCleanupCandidateItem {
  icon_id: number;
  icon_code: string;
  provider_type: string;
  provider_key: string;
  preview: null;
  is_provider_available: boolean;
  can_register_again: boolean;
  created_at: string;
}

interface CreateIconCommand {
  userId: bigint;
  iconCode: string;
  show?: boolean;
}

interface UpdateIconCommand {
  iconId: bigint;
  userId: bigint;
  show?: boolean;
}

@Injectable()
export class IconsService {
  constructor(
    private readonly iconsRepository: IconsRepository,
    @Inject(ICON_PROVIDER_ADAPTER)
    private readonly iconProviderAdapter: IconProviderAdapter
  ) {}

  async getIcons(userId: bigint, show?: boolean): Promise<{ items: IconItem[] }> {
    const icons = await this.iconsRepository.findManyForUser(userId, show);
    return { items: icons.map((icon) => this.toItem(icon)) };
  }

  async getCleanupCandidates(userId: bigint): Promise<{ items: IconCleanupCandidateItem[] }> {
    const icons = await this.iconsRepository.findCleanupCandidates(userId);
    return { items: icons.map((icon) => this.toCleanupCandidateItem(icon)) };
  }

  async searchIconOptions(keyword: string): Promise<{ items: IconOptionItem[] }> {
    const normalizedKeyword = keyword.trim().toLowerCase();
    if (!normalizedKeyword) return { items: [] };

    const dictionaryOptions = await this.iconsRepository.searchDictionaries(normalizedKeyword);
    const providerOptions = this.iconProviderAdapter.search(normalizedKeyword);
    const options = new Map<string, IconOptionItem>();

    for (const dictionary of dictionaryOptions) {
      options.set(dictionary.iconCode, this.toOptionFromDictionary(dictionary));
    }

    for (const providerOption of providerOptions) {
      options.set(providerOption.iconCode, this.toOptionFromProvider(providerOption));
    }

    return { items: Array.from(options.values()).slice(0, 24) };
  }

  async createIcon(command: CreateIconCommand): Promise<{ icon_id: number }> {
    const dictionary = await this.resolveDictionary(command.iconCode);
    await this.assertDuplicate(command.userId, dictionary.iconDictionaryId);

    const icon = await this.iconsRepository.createUserIcon({
      user: { connect: { userId: command.userId } },
      iconDictionary: { connect: { iconDictionaryId: dictionary.iconDictionaryId } },
      show: command.show ?? true,
      isDefault: false
    });

    return { icon_id: Number(icon.iconId) };
  }

  async updateIcon(command: UpdateIconCommand): Promise<Pick<IconItem, "icon_id" | "show">> {
    if (command.show === undefined) {
      throw new AppException(
        "VALIDATION_001",
        "수정 가능한 필드가 없습니다.",
        HttpStatus.BAD_REQUEST
      );
    }

    const icon = await this.iconsRepository.findEditableIcon(command.iconId, command.userId);
    if (!icon) {
      throw new AppException("ICON_002", "아이콘이 없습니다.", HttpStatus.NOT_FOUND);
    }

    const updated = await this.iconsRepository.updateIcon(command.iconId, {
      show: command.show
    });

    return {
      icon_id: Number(updated.iconId),
      show: updated.show
    };
  }

  private async resolveDictionary(iconCode: string): Promise<IconDictionary> {
    const existing = await this.iconsRepository.findDictionaryByIconCode(iconCode);
    if (existing) return existing;

    const providerOption = this.iconProviderAdapter.resolveByIconCode(iconCode);
    if (!providerOption) {
      throw new AppException("ICON_003", "등록 가능한 아이콘이 아닙니다.", HttpStatus.BAD_REQUEST);
    }

    return this.iconsRepository.upsertDictionary({
      iconCode: providerOption.iconCode,
      providerType: providerOption.providerType,
      providerKey: providerOption.providerKey,
      searchKeywords: providerOption.searchKeywords
    });
  }

  private async assertDuplicate(userId: bigint, iconDictionaryId: bigint): Promise<void> {
    const existing = await this.iconsRepository.findAvailableIconByDictionaryId(
      userId,
      iconDictionaryId
    );
    if (existing) {
      throw new AppException("ICON_001", "중복 아이콘입니다.", HttpStatus.CONFLICT);
    }
  }

  private toItem(icon: IconWithDictionary): IconItem {
    return {
      icon_id: Number(icon.iconId),
      icon_code: icon.iconDictionary.iconCode,
      provider_type: icon.iconDictionary.providerType,
      provider_key: icon.iconDictionary.providerKey,
      snapshot: icon.iconDictionary.snapshot
        ? { snapshot_hash: icon.iconDictionary.snapshot.snapshotHash, snapshot_format: icon.iconDictionary.snapshot.snapshotFormat, snapshot_payload: icon.iconDictionary.snapshot.snapshotPayload }
        : null,
      show: icon.show,
      is_default: icon.isDefault,
      created_at: icon.createdAt.toISOString(),
      updated_at: icon.updatedAt.toISOString()
    };
  }

  private toCleanupCandidateItem(icon: IconWithDictionary): IconCleanupCandidateItem {
    const isProviderAvailable =
      icon.iconDictionary.providerType === this.iconProviderAdapter.providerType &&
      this.iconProviderAdapter.validate(icon.iconDictionary.providerKey);

    return {
      icon_id: Number(icon.iconId),
      icon_code: icon.iconDictionary.iconCode,
      provider_type: icon.iconDictionary.providerType,
      provider_key: icon.iconDictionary.providerKey,
      preview: null,
      is_provider_available: isProviderAvailable,
      can_register_again: isProviderAvailable,
      created_at: icon.createdAt.toISOString()
    };
  }

  private toOptionFromDictionary(dictionary: IconDictionary): IconOptionItem {
    return {
      icon_code: dictionary.iconCode,
      provider_type: dictionary.providerType,
      provider_key: dictionary.providerKey
    };
  }

  private toOptionFromProvider(providerOption: IconProviderOption): IconOptionItem {
    return {
      icon_code: providerOption.iconCode,
      provider_type: providerOption.providerType,
      provider_key: providerOption.providerKey
    };
  }
}
