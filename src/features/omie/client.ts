import { validateOmieOrder } from "@/features/omie/api";

export async function validateOmieOrderClient(numeroPedido: string) {
  return validateOmieOrder({ data: { numeroPedido } });
}
