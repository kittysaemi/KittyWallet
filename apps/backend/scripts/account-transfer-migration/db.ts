import { PrismaClient } from "@prisma/client";

/**
 * 스크립트 전용 Prisma 클라이언트.
 * NestJS DI 컨테이너를 거치지 않는 독립 실행 스크립트이므로 별도로 생성한다.
 * 반드시 DATABASE_URL 환경변수가 가리키는 DB에서만 실행된다 — 대상 DB를 항상 먼저 확인할 것.
 */
export function createScriptPrismaClient(): PrismaClient {
  if (!process.env.DATABASE_URL) {
    throw new Error(
      "DATABASE_URL 환경변수가 설정되어 있지 않습니다. 이 스크립트는 어떤 DB를 대상으로 하는지 " +
        "항상 명시적으로 지정해야 합니다 (운영 DB로 잘못 연결되는 사고를 막기 위함)."
    );
  }
  return new PrismaClient();
}

export const TRANSFER_CATEGORY_NAME = "계좌금액이동";
