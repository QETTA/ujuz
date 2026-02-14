
import { Tabs } from 'expo-router';
import { COLORS } from '../../lib/constants';

import { StyledText as Text } from '@/components/ui/StyledText';
export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: COLORS.brand500,
        tabBarInactiveTintColor: COLORS.textTertiary,
        tabBarStyle: {
          backgroundColor: COLORS.background,
          borderTopWidth: 1,
          borderTopColor: COLORS.borderSubtle,
          paddingBottom: 4,
          paddingTop: 4,
          height: 56,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: '홈',
          tabBarIcon: ({ color }) => <TabIcon emoji="🏠" color={color} />,
        }}
      />
      <Tabs.Screen
        name="map"
        options={{
          title: '지도',
          tabBarIcon: ({ color }) => <TabIcon emoji="📍" color={color} />,
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: '상담',
          tabBarIcon: ({ color }) => <TabIcon emoji="💬" color={color} />,
        }}
      />
      <Tabs.Screen
        name="alerts"
        options={{
          title: '알림',
          tabBarIcon: ({ color }) => <TabIcon emoji="🔔" color={color} />,
        }}
      />
      <Tabs.Screen
        name="my"
        options={{
          title: 'MY',
          tabBarIcon: ({ color }) => <TabIcon emoji="👤" color={color} />,
        }}
      />
    </Tabs>
  );
}

function TabIcon({ emoji, color }: { emoji: string; color: string }) {
  return (
    <Text style={{ fontSize: 20, opacity: color === COLORS.brand500 ? 1 : 0.5 }}>
      {emoji}
    </Text>
  );
}
