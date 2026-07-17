// ════════════════════════════════════════════════════════════
// lib/numbering.ts — human-readable ID generation
// RX-2026-ELD-000001 / SALE-2026-ELD-00001 / PO-2026-ELD-001
// ════════════════════════════════════════════════════════════

import { prisma } from '../config/prisma'
import { redis }  from '../config/redis'

type EntityType = 'RX' | 'SALE' | 'PO' | 'EXP'

export async function generateNumber(
  type: EntityType,
  branchCode: string, // e.g. "ELD", "NBI", "KSM"
): Promise<string> {
  const year = new Date().getFullYear()
  const key  = `seq:${type}:${year}:${branchCode}`
  const seq  = await redis.incr(key)

  // Set 1-year expiry on first use so old keys clean themselves up
  if (seq === 1) await redis.expire(key, 60 * 60 * 24 * 400)

  const padMap: Record<EntityType, number> = { RX: 6, SALE: 5, PO: 4, EXP: 5 }
  const padded = String(seq).padStart(padMap[type], '0')

  return `${type}-${year}-${branchCode.toUpperCase()}-${padded}`
  // → "RX-2026-ELD-000001"
  // → "SALE-2026-ELD-00001"
  // → "PO-2026-ELD-0001"
}


