import { StyleSheet, Text, View } from "react-native";
import { fr } from "@greline/i18n";
import { colors, spacing } from "@greline/theme";

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{fr.app.name}</Text>
      <Text style={styles.tagline}>{fr.app.tagline}</Text>
      <Text style={styles.credit}>
        {fr.app.unofficial} {fr.app.dataCredit}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
    padding: spacing.xl,
    backgroundColor: colors.background,
  },
  title: { fontSize: 44, fontWeight: "700", color: colors.text },
  tagline: { fontSize: 20, color: colors.accent },
  credit: { fontSize: 12, color: colors.textMuted, textAlign: "center" },
});
