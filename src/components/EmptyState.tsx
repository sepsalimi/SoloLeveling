import { Card } from "@/components/Card";
import { Text } from "@/components/Text";

export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <Card>
      <Text variant="heading">{title}</Text>
      <Text variant="caption">{body}</Text>
    </Card>
  );
}

