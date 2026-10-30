import { FlatList } from "react-native";
import { Text, View, XStack } from "tamagui";
import type { Track } from "react-native-track-player";

type Props = {
  queue: Track[];
  playingIndex: number;
  formatTime: (seconds: number) => string;
  onSelectTrack: (index: number) => void;
};

/** 1:1 port of old lissen-mobile AlbumItemsContainer. */
export function PlayerQueueList({ queue, playingIndex, formatTime, onSelectTrack }: Props) {
  if (!queue || queue.length === 0) {
    return (
      <View width="100%" marginTop={40} alignItems="center">
        <Text fontFamily="body" fontSize={16} color="$color">
          No items to display
        </Text>
      </View>
    );
  }

  return (
    <View width="100%" maxHeight={300} marginTop={40}>
      <FlatList
        data={queue}
        keyExtractor={(item, index) => String(item.id ?? index)}
        renderItem={({ item, index }) => {
          const isActive = index === playingIndex;
          return (
            <XStack
              justifyContent="space-between"
              alignItems="center"
              paddingVertical={10}
              paddingHorizontal={40}
              onPress={() => onSelectTrack(index)}
            >
              <Text
                fontFamily="body"
                fontSize={14}
                fontWeight={isActive ? "700" : "400"}
                color="$color"
                flex={1}
                numberOfLines={1}
              >
                {item.title as string}
              </Text>
              <Text
                fontFamily="body"
                fontSize={14}
                fontWeight={isActive ? "700" : "400"}
                color="$color"
              >
                {formatTime(item.duration ?? 0)}
              </Text>
            </XStack>
          );
        }}
      />
    </View>
  );
}
