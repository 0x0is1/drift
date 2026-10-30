import { Tabs } from "expo-router";
import { usePathname } from "expo-router";
import { Home, Search, ListMusic, Flame, User } from "@tamagui/lucide-icons";
import { useTheme } from "tamagui";
import { Pressable, View, type PressableProps } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { tokens } from "@theme/tokens";
import { FEED_CIRCLE_SIZE, FEED_BORDER_WIDTH, FEED_BUTTON_PROTRUSION } from "@constants/routes";

// Feed sits dead-center, raised clear of the bar in a circular pill (the
// "camera button" pattern). The circle is position:"absolute" with an
// explicit `top` — NOT marginTop inside the flex flow. A flex-end-justified
// row anchors its content block to the container's bottom regardless of
// marginTop (margin-top only adds space ABOVE the block, it doesn't move
// the block's own bottom edge), so a marginTop-based raise silently had no
// effect on where the circle actually sat. Absolute positioning opts the
// circle out of that flow entirely, so `top` is exact. The container itself
// stacks top-down (not flex-end) so the label's position is simply "circle's
// in-bar depth + a gap" — flex-end here would re-anchor the label to the
// container's bottom independent of the circle, letting a big enough circle
// visually cover it (which is what happened before this).
function FeedTabButton({
  onPress,
  barBg,
}: {
  onPress?: PressableProps["onPress"];
  barBg: string;
}) {
  return (
    <Pressable onPress={onPress} style={{ flex: 1, alignItems: "center" }}>
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          top: -FEED_BUTTON_PROTRUSION,
          alignItems: "center",
          justifyContent: "center",
          width: FEED_CIRCLE_SIZE,
          height: FEED_CIRCLE_SIZE,
          borderRadius: FEED_CIRCLE_SIZE / 2,
          backgroundColor: tokens.color.tealAccent.val,
          borderWidth: FEED_BORDER_WIDTH,
          borderColor: barBg,
          elevation: 8,
        }}
      >
        <Flame color={tokens.color.black.val} size={28} fill={tokens.color.black.val} />
      </View>
    </Pressable>
  );
}

export default function TabsLayout() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const hideTabBar = pathname.startsWith("/feed");
  const barBg = theme.backgroundStrong?.val as string;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.accent?.val as string,
        tabBarInactiveTintColor: theme.colorSecondary?.val as string,
        tabBarStyle: hideTabBar
          ? { display: "none" }
          : {
              backgroundColor: theme.backgroundStrong?.val as string,
              borderTopColor: theme.borderColor?.val as string,
              height: 56 + Math.max(insets.bottom, 16) + 8,
              paddingBottom: Math.max(insets.bottom, 16) + 8,
              paddingTop: 8,
              // Elevation on Android clips children that exceed the bar's own
              // bounds, which silently swallows the Feed button's protrusion
              // above the top edge — must stay visible for the raise to show.
              overflow: "visible",
            },
        tabBarLabelStyle: { fontFamily: "Rajdhani_600SemiBold", fontSize: 12 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: "Home", tabBarIcon: ({ color, size }) => <Home color={color as string} size={size} /> }}
      />
      <Tabs.Screen
        name="search"
        options={{ title: "Search", tabBarIcon: ({ color, size }) => <Search color={color as string} size={size} /> }}
      />
      <Tabs.Screen
        name="feed"
        options={{
          title: "",
          tabBarButton: (props) => <FeedTabButton onPress={props.onPress} barBg={barBg} />,
        }}
      />
      <Tabs.Screen
        name="library"
        options={{ title: "Library", tabBarIcon: ({ color, size }) => <ListMusic color={color as string} size={size} /> }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: "Profile", tabBarIcon: ({ color, size }) => <User color={color as string} size={size} /> }}
      />
    </Tabs>
  );
}
