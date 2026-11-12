import { computed } from "vue";
import { usePermissions } from "@vc-shell/framework";

export const MANAGE_PERMISSION = "guided-tours:manage";

export function useToursPermissions() {
  const { hasAccess } = usePermissions();
  return {
    canManage: computed(() => hasAccess(MANAGE_PERMISSION)),
  };
}
