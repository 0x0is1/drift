import { Drawer } from "expo-router/drawer";
import { Download, Settings, Info, GitBranch } from "@tamagui/lucide-icons";
import { useTheme } from "tamagui";
import { DrawerContent } from "@components/drawer/DrawerContent";

export default function DrawerLayout() {
  const theme = useTheme();

  return (
    <Drawer
      drawerContent={(props) => <DrawerContent {...props} />}
      screenOptions={{
        headerShown: false,
        swipeEnabled: false,
        drawerActiveTintColor: theme.accent?.val as string,
        drawerInactiveTintColor: theme.colorSecondary?.val as string,
        drawerStyle: { backgroundColor: theme.drawerBackground?.val as string, width: 280 },
        drawerLabelStyle: { fontFamily: "Rajdhani_600SemiBold", fontSize: 16 },
        drawerItemStyle: { paddingVertical: 2 },
      }}
    >
      <Drawer.Screen name="(tabs)" options={{ title: "Home", drawerItemStyle: { display: "none" } }} />
      <Drawer.Screen
        name="downloads"
        options={{ title: "Downloads", drawerIcon: ({ color }) => <Download size={22} color={color as string} /> }}
      />
      <Drawer.Screen
        name="settings"
        options={{ title: "Settings", drawerIcon: ({ color }) => <Settings size={22} color={color as string} /> }}
      />
      <Drawer.Screen
        name="about"
        options={{ title: "About", drawerIcon: ({ color }) => <Info size={22} color={color as string} /> }}
      />
      <Drawer.Screen
        name="version"
        options={{ title: "Version", drawerIcon: ({ color }) => <GitBranch size={22} color={color as string} /> }}
      />
    </Drawer>
  );
}
