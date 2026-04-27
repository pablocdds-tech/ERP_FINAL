import { Badge } from "@/components/ui/badge";
import { statusInfo } from "@/lib/atendimento-config";

export default function StatusBadge({ status }) {
  const info = statusInfo(status);
  return <Badge className={info.cor}>{info.l}</Badge>;
}