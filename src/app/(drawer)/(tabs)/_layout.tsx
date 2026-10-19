import { Tabs } from "expo-router";
import { usePathname } from "expo-router";
import { Home, Search, ListMusic, Flame, User } from "@tamagui/lucide-icons";
import { useTheme } from "tamagui";
import { Pressable, View, Text, type PressableProps } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { tokens } from "@theme/tokens";
import { FEED_CIRCLE_SIZE, FEED_BORDER_WIDTH, FEED_RAISE } from "@constants/routes";

// Feed sits dead-center, raised clear of the bar in a circular pill (the
// "camera button" pattern) — a custom tabBarButton is required since the
// default renderer clips icons to the bar's own height and can't float one
// above it. Sized up + labeled so it fills the extra bottom whitespace the
// raise would otherwise leave under it, matching the other tabs' icon+label
// footprint instead of looking like a bare floating dot.
function FeedTabButton({
  onPress,
  barBg,
}: {
  onPress?: PressableProps["onPress"];
  barBg: string;
}) {
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "flex-end", paddingBottom: 8 }}>
      <Pressable
        onPress={onPress}
        android_ripple={{ color: tokens.color.tealAccentDim.val, borderless: true, radius: FEED_CIRCLE_SIZE / 2 }}
        style={{
          alignItems: "center",
          justifyContent: "center",
          width: FEED_CIRCLE_SIZE,
          height: FEED_CIRCLE_SIZE,
          borderRadius: FEED_CIRCLE_SIZE / 2,
          overflow: "hidden",
          marginTop: -FEED_RAISE,
          backgroundColor: tokens.color.tealAccent.val,
          borderWidth: FEED_BORDER_WIDTH,
          borderColor: barBg,
          elevation: 8,
        }}
      >
        <Flame color={tokens.color.black.val} size={24} fill={tokens.color.black.val} />
      </Pressable>
      <Text style={{ marginTop: 4, fontFamily: "Rajdhani_600SemiBold", fontSize: 12, color: tokens.color.tealAccent.val }}>
        Feed
      </Text>
    </View>
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
