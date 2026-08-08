import { Tabs, useRouter } from "expo-router";

import { Icon } from "../../components/Icon";
import { TabBarAddButton, navigationScreenOptions } from "../../components/TabBar";

export default function TabsLayout() {
  const router = useRouter();

  return (
    <Tabs screenOptions={navigationScreenOptions}>
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => <Icon name="home" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="budget"
        options={{
          title: "Budget",
          tabBarIcon: ({ color, size }) => <Icon name="budget" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="add"
        options={{
          title: "",
          tabBarButton: () => (
            <TabBarAddButton onPress={() => router.push("/add-transaction")} />
          ),
        }}
      />
      <Tabs.Screen
        name="progress"
        options={{
          title: "Insights",
          tabBarIcon: ({ color, size }) => <Icon name="progress" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ color, size }) => <Icon name="settings" color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
