import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';
import DashboardScreen from '../screens/shared/DashboardScreen';
import { CalendarScreen } from '../screens/shared/CalendarScreen';
import ReportsScreen    from '../screens/shared/ReportsScreen';
import SettingsScreen   from '../screens/shared/SettingsScreen';
import { COLORS } from '../theme/colors';

const Tab = createBottomTabNavigator();

const icon = (name) => ({ focused }) => (
  <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.5 }}>{name}</Text>
);

export default function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown:         false,
        tabBarActiveTintColor:   COLORS.blue,
        tabBarInactiveTintColor: COLORS.muted,
        tabBarStyle: { borderTopColor: COLORS.border, paddingBottom: 6, height: 60 },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}>
      <Tab.Screen name="Dashboard" component={DashboardScreen} options={{ title:'डैशबोर्ड', tabBarIcon: icon('🏠') }} />
      <Tab.Screen name="Calendar"  component={CalendarScreen}  options={{ title:'कैलेंडर',  tabBarIcon: icon('📅') }} />
      <Tab.Screen name="Reports"   component={ReportsScreen}   options={{ title:'रिपोर्ट',  tabBarIcon: icon('📊') }} />
      <Tab.Screen name="Settings"  component={SettingsScreen}  options={{ title:'सेटिंग्स', tabBarIcon: icon('⚙️') }} />
    </Tab.Navigator>
  );
}
