import { XStack, useTheme } from "tamagui";
import { ActivityIndicator } from "react-native";
import { Play, Pause, SkipBack, SkipForward, Repeat, Shuffle } from "@tamagui/lucide-icons";

type Props = {
  bottomInset: number;
  isPlaying: boolean;
  isLoading: boolean;
  onRepeat: boolean;
  onShuffle: boolean;
  onToggleRepeat: () => void;
  onToggleShuffle: () => void;
  onPrevious: () => void;
  onNext: () => void;
  onPlayPause: () => void;
};

/** 1:1 port of old lissen-mobile PlayerFooter, themed to $background/$color. */
export function PlayerTransportControls({
  bottomInset,
  isPlaying,
  isLoading,
  onRepeat,
  onShuffle,
  onToggleRepeat,
  onToggleShuffle,
  onPrevious,
  onNext,
  onPlayPause,
}: Props) {
  const theme = useTheme();
  const color = theme.color?.val as string;
  const background = theme.background?.val as string;

  const activeBadgeStyle = {
    backgroundColor: theme.backgroundHover?.val as string,
    shadowColor: theme.shadowColor?.val as string,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 24,
  };

  return (
    <XStack
      width="100%"
      paddingHorizontal={15}
      paddingTop={16}
      paddingBottom={bottomInset + 24}
      justifyContent="space-between"
      alignItems="center"
      backgroundColor="$background"
    >
      <XStack
        padding={10}
        borderRadius={50}
        style={onRepeat ? activeBadgeStyle : undefined}
        onPress={onToggleRepeat}
      >
        <Repeat color={color} size={25} />
      </XStack>

      <XStack alignItems="center" gap={24}>
        <SkipBack color={color} size={25} onPress={onPrevious} />
        <XStack
          width={70}
          height={70}
          borderRadius={35}
          backgroundColor="$color"
          alignItems="center"
          justifyContent="center"
          onPress={onPlayPause}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color={background} />
          ) : isPlaying ? (
            <Pause size={30} color={background} />
          ) : (
            <Play size={30} color={background} />
          )}
        </XStack>
        <SkipForward color={color} size={25} onPress={onNext} />
      </XStack>

      <XStack
        padding={10}
        borderRadius={50}
        style={onShuffle ? activeBadgeStyle : undefined}
        onPress={onToggleShuffle}
      >
        <Shuffle color={color} size={25} />
      </XStack>
    </XStack>
  );
}
