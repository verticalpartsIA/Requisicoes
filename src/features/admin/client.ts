import { supabaseBrowser } from "@/lib/supabase-browser";
import type { AppRole } from "@/features/auth/auth-context";

export interface AdminUserRoleState {
  role: AppRole;
  enabled: boolean;
  approvalTier: 1 | 2 | 3 | null;
}

export interface AdminUserItem {
  id: string;
  fullName: string | null;
  email: string | null;
  department: string | null;
  roles: AdminUserRoleState[];
}

const ALL_ROLES: AppRole[] = ["admin", "solicitante", "comprador", "aprovador", "almoxarife"];

function createDefaultRoles(): AdminUserRoleState[] {
  return ALL_ROLES.map((role) => ({
    role,
    enabled: role === "solicitante",
    approvalTier: null,
  }));
}

export async function listAdminUsersClient() {
  const [{ data: profiles, error: profilesError }, { data: roles, error: rolesError }] = await Promise.all([
    supabaseBrowser
      .from("profiles")
      .select("id,full_name,email,department")
      .order("full_name", { ascending: true }),
    supabaseBrowser
      .from("user_roles")
      .select("id,user_id,role,approval_tier"),
  ]);

  if (profilesError) throw profilesError;
  if (rolesError) throw rolesError;

  const rolesByUser = new Map<string, typeof roles>();
  (roles || []).forEach((role) => {
    const current = rolesByUser.get(role.user_id) || [];
    current.push(role);
    rolesByUser.set(role.user_id, current);
  });

  return (profiles || []).map((profile) => {
    const defaultRoles = createDefaultRoles();
    const assignedRoles = rolesByUser.get(profile.id) || [];

    assignedRoles.forEach((assignedRole) => {
      const target = defaultRoles.find((role) => role.role === assignedRole.role);
      if (!target) return;
      target.enabled = true;
      target.approvalTier = (assignedRole.approval_tier as 1 | 2 | 3 | null) || null;
    });

    return {
      id: profile.id,
      fullName: profile.full_name,
      email: profile.email,
      department: profile.department,
      roles: defaultRoles,
    } satisfies AdminUserItem;
  });
}

export async function saveAdminUserRolesClient(
  targetUserId: string,
  nextRoles: AdminUserRoleState[],
  currentUserId?: string,
) {
  const enabledRoles = nextRoles.filter((role) => role.enabled);

  if (enabledRoles.length === 0) {
    throw new Error("Cada usuário precisa ter pelo menos um papel ativo.");
  }

  if (currentUserId === targetUserId && !enabledRoles.some((role) => role.role === "admin")) {
    throw new Error("Você não pode remover o próprio papel de admin.");
  }

  const approverWithoutTier = enabledRoles.find((role) => role.role === "aprovador" && !role.approvalTier);
  if (approverWithoutTier) {
    throw new Error("Todo aprovador precisa ter uma alçada definida.");
  }

  const { data: existing, error: existingError } = await supabaseBrowser
    .from("user_roles")
    .select("id,role")
    .eq("user_id", targetUserId);

  if (existingError) throw existingError;

  const enabledRoleNames = new Set(enabledRoles.map((role) => role.role));
  const existingRoleNames = new Set((existing || []).map((role) => role.role as AppRole));

  const rolesToDelete = (existing || [])
    .filter((role) => !enabledRoleNames.has(role.role as AppRole))
    .map((role) => role.id);

  if (rolesToDelete.length > 0) {
    const { error: deleteError } = await supabaseBrowser.from("user_roles").delete().in("id", rolesToDelete);
    if (deleteError) throw deleteError;
  }

  const upsertPayload = enabledRoles.map((role) => ({
    user_id: targetUserId,
    role: role.role,
    approval_tier: role.role === "aprovador" ? role.approvalTier : null,
  }));

  const { error: upsertError } = await supabaseBrowser
    .from("user_roles")
    .upsert(upsertPayload, { onConflict: "user_id,role" });
  if (upsertError) throw upsertError;

  const { error: syncError } = await supabaseBrowser
    .from("user_roles")
    .update({ approval_tier: null })
    .eq("user_id", targetUserId)
    .neq("role", "aprovador");

  if (syncError) throw syncError;
}

// ─── Departamento e Gestores de Departamento ──────────────────────────────────

export async function setUserDepartmentClient(userId: string, department: string): Promise<void> {
  const { error } = await supabaseBrowser
    .from("profiles")
    .update({ department: department.trim() || null })
    .eq("id", userId);
  if (error) throw error;
}

export interface DeptManagerEntry {
  id: string;
  department: string;
  manager_user_id: string;
}

export async function listDeptManagersClient(): Promise<DeptManagerEntry[]> {
  const { data, error } = await supabaseBrowser
    .from("department_managers")
    .select("id, department, manager_user_id")
    .order("department");
  if (error) throw error;
  return (data ?? []) as DeptManagerEntry[];
}

export async function addDeptManagerClient(department: string, userId: string): Promise<void> {
  const { error } = await supabaseBrowser
    .from("department_managers")
    .insert({ department: department.trim(), manager_user_id: userId });
  if (error) throw error;
}

export async function removeDeptManagerClient(entryId: string): Promise<void> {
  const { error } = await supabaseBrowser
    .from("department_managers")
    .delete()
    .eq("id", entryId);
  if (error) throw error;
}
