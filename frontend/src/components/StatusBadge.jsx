import { Badge } from "./ui";
import { getStatusConfig } from "../utils/statusConfig";

export default function StatusBadge({ status, className = "" }) {
  const config = getStatusConfig(status);
  return (
    <Badge
      variant={config.variant}
      icon={config.icon}
      className={className}
      data-status={status || "desconhecido"}
      aria-label={`Status: ${config.label}`}
    >
      {config.label}
    </Badge>
  );
}
