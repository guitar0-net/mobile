import { useRouter } from "expo-router";
import { useEffect } from "react";
import { View } from "react-native";

export default function Index() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/(tabs)/home");
  }, []);

  return <View className="flex-1 bg-white dark:bg-black" />;
}
