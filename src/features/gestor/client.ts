import { getManagerDepartments, listGestorQueue, gestorApprove, gestorReject } from "@/features/gestor/api";
import type { GestorQueueItem } from "@/features/gestor/api";

export type { GestorQueueItem };

export async function getManagerDepartmentsClient(managerId: string): Promise<string[]> {
  return getManagerDepartments({ data: { managerId } });
}

export async function listGestorQueueClient(departments: string[]): Promise<GestorQueueItem[]> {
  return listGestorQueue({ data: { departments } });
}

export async function gestorApproveClient(
  requisitionId: string,
  gestorName: string,
  notes?: string,
): Promise<void> {
  await gestorApprove({ data: { requisitionId, gestorName, notes: notes ?? "" } });
}

export async function gestorRejectClient(
  requisitionId: string,
  gestorName: string,
  reason: string,
): Promise<void> {
  await gestorReject({ data: { requisitionId, gestorName, reason } });
}
