"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { STATUSES, type Status } from "@/lib/options";

function cleanIds(ids: unknown) {
  if (!Array.isArray(ids)) return [];
  return ids.filter((id): id is string => typeof id === "string").slice(0, 5000);
}

export async function setStatus(ids: string[], status: Status) {
  await requireAdmin();
  if (!STATUSES.includes(status)) throw new Error("Invalid status");
  const list = cleanIds(ids);
  if (!list.length) return { count: 0 };
  const { count } = await db.application.updateMany({ where: { id: { in: list } }, data: { status } });
  revalidatePath("/admin");
  return { count };
}

export async function deleteApplications(ids: string[]) {
  await requireAdmin();
  const list = cleanIds(ids);
  if (!list.length) return { count: 0 };
  const { count } = await db.application.deleteMany({ where: { id: { in: list } } });
  revalidatePath("/admin");
  return { count };
}
