import { View, XStack } from "tamagui";
import { Skeleton } from "@components/ui/Skeleton";

export function HomeSkeleton() {
  return (
    <View paddingTop={16} gap={24}>
      {Array.from({ length: 3 }).map((_, row) => (
        <View key={row} gap={12}>
          <Skeleton width={140} height={20} borderRadius={6} style={{ marginLeft: 24 }} />
          <XStack paddingHorizontal={24} gap={12}>
            {Array.from({ length: 3 }).map((__, i) => (
              <View key={i} width={140} gap={8}>
                <Skeleton width={140} height={140} borderRadius={12} />
                <Skeleton width="80%" height={13} />
              </View>
            ))}
          </XStack>
        </View>
      ))}
    </View>
  );
}
