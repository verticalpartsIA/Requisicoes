import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseRest } from "@/lib/supabase-rest";

interface GestorRequisition {
  id: string;
  ticket_number: string;
  module: string;
  title: string;
  justification: string;
  requester_name: string;
  requester_department: string | null;
  urgency: string;
  created_at: string;
}

export interface GestorQueueItem {
  requisitionId: string;
  ticketNumber: string;
  module: string;
  title: string;
  justification: string;
  requesterName: string;
  requesterDepartment: string;
  urgency: string;
  createdAt: string;
}

export const getManagerDepartments = createServerFn({ method: "GET" })
  .inputValidator(z.object({ managerId: z.string().uuid() }))
  .handler(async ({ data }) => {
    const response = await supabaseRest<{ department: string }[]>(
      `department_managers?select=department&manager_user_id=eq.${data.managerId}`,
    );
    return (response.data ?? []).map((r) => r.department);
  });

export const listGestorQueue = createServerFn({ method: "POST" })
  .inputValidator(z.object({ departments: z.array(z.string()).min(1) }))
  .handler(async ({ data }) => {
    const deptsEncoded = data.departments.map((d) => encodeURIComponent(d)).join(",");
    const response = await supabaseRest<GestorRequisition[]>(
      `requisitions?select=id,ticket_number,module,title,justification,requester_name,requester_department,urgency,created_at&status=eq.GESTOR&requester_department=in.(${deptsEncoded})&order=created_at.asc`,
    );
    return (response.data ?? []).map((r): GestorQueueItem => ({
      requisitionId: r.id,
      ticketNumber: r.ticket_number,
      module: r.module,
      title: r.title,
      justification: r.justification,
      requesterName: r.requester_name,
      requesterDepartment: r.requester_department ?? "—",
      urgency: r.urgency,
      createdAt: new Date(r.created_at).toLocaleDateString("pt-BR"),
    }));
  });

export const gestorApprove = createServerFn({ method: "POST" })
  .inputValidator(z.object({
    requisitionId: z.string().uuid(),
    gestorName: z.string(),
    notes: z.string().max(500).optional().default(""),
  }))
  .handler(async ({ data }) => {
    const recResp = await supabaseRest<{ ticket_number: string; status: string }[]>(
      `requisitions?select=ticket_number,status&id=eq.${data.requisitionId}&limit=1`,
    );
    const rec = recResp.data[0];
    if (!rec) throw new Error("Requisição não encontrada.");

    await supabaseRest(`requisitions?id=eq.${data.requisitionId}`, {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: { status: "ABERTO" },
    });

    await supabaseRest("audit_logs", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: [{
        requisition_id: data.requisitionId,
        ticket_number: rec.ticket_number,
        action: "GESTOR_APPROVED",
        old_status: "GESTOR",
        new_status: "ABERTO",
        actor_name: data.gestorName,
        details: { notes: data.notes },
      }],
    });

    return { ok: true };
  });

export const gestorReject = createServerFn({ method: "POST" })
  .inputValidator(z.object({
    requisitionId: z.string().uuid(),
    gestorName: z.string(),
    reason: z.string().min(1).max(500),
  }))
  .handler(async ({ data }) => {
    const recResp = await supabaseRest<{ ticket_number: string; status: string }[]>(
      `requisitions?select=ticket_number,status&id=eq.${data.requisitionId}&limit=1`,
    );
    const rec = recResp.data[0];
    if (!rec) throw new Error("Requisição não encontrada.");

    await supabaseRest(`requisitions?id=eq.${data.requisitionId}`, {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: { status: "REJEITADO" },
    });

    await supabaseRest("audit_logs", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: [{
        requisition_id: data.requisitionId,
        ticket_number: rec.ticket_number,
        action: "GESTOR_REJECTED",
        old_status: "GESTOR",
        new_status: "REJEITADO",
        actor_name: data.gestorName,
        details: { reason: data.reason },
      }],
    });

    return { ok: true };
  });
