import { View, Text } from "tamagui";

/**
 * Temporary placeholder — real screen design comes from Stitch
 * (get_screen/generate_variants) once that MCP server is live. See
 * CLAUDE.md "Branding" section. Replace, don't build final UI against this.
 */
export function ScreenPlaceholder({ title }: { title: string }) {
  return (
    <View flex={1} backgroundColor="$background" alignItems="center" justifyContent="center" gap={8}>
      <Text fontFamily="heading" fontSize="11" color="$accent" letterSpacing={1.2}>
        {title}
      </Text>
      <Text fontFamily="body" fontSize="5" color="$colorSecondary">
        pending Stitch design pass
      </Text>
    </View>
  );
}
