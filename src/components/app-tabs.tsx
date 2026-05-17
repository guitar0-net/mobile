import { NativeTabs } from "expo-router/unstable-native-tabs";

export default function AppTabs() {
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="home">
        <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="house" md="home" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="lessons">
        <NativeTabs.Trigger.Label>Lessons</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="music.note.list" md="library_music" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
