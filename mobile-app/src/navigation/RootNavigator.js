import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import { LoadingScreen } from '../components/UI';
import { COLORS } from '../theme/colors';

// Screens
import LoginScreen          from '../screens/LoginScreen';
import MainTabs             from './MainTabs';
import BillDetailScreen     from '../screens/shared/BillDetailScreen';

// Admin screens
import CreateBillScreen     from '../screens/admin/CreateBillScreen';
import StockScreen          from '../screens/admin/StockScreen';
import CustomersScreen      from '../screens/admin/CustomersScreen';
import CreateCustomerScreen from '../screens/admin/CreateCustomerScreen';
import { CustomerContactScreen }   from '../screens/admin/CustomerContactScreen';
import { ContactSettingsPinScreen, ContactDirectoryScreen } from '../screens/admin/ContactSettingsScreens';
import { DownloadTrackerGateScreen, DownloadTrackerListScreen } from '../screens/admin/DownloadTrackerScreens';
import BillNumberSettingsScreen from '../screens/admin/BillNumberSettingsScreen';

const Stack = createNativeStackNavigator();

const headerStyle = { headerStyle: { backgroundColor: COLORS.blue }, headerTintColor: '#fff', headerTitleStyle: { fontWeight: '700' } };

export default function RootNavigator() {
  const { user, loading } = useAuth();

  if (loading) return <LoadingScreen />;

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!user ? (
          <Stack.Screen name="Login" component={LoginScreen} />
        ) : (
          <>
            {/* Main tabs (Dashboard, Calendar, Reports, Settings) */}
            <Stack.Screen name="Main" component={MainTabs} />

            {/* Shared — accessible by all roles */}
            <Stack.Screen name="BillDetail"     component={BillDetailScreen}     options={{ ...headerStyle, headerShown:true, title:'Bill Detail' }} />

            {/* Admin-only screens */}
            <Stack.Screen name="CreateBill"     component={CreateBillScreen}     options={{ ...headerStyle, headerShown:true, title:'नया बिल बनाएं' }} />
            <Stack.Screen name="Stock"          component={StockScreen}          options={{ ...headerStyle, headerShown:true, title:'स्टॉक प्रबंधन' }} />
            <Stack.Screen name="Customers"      component={CustomersScreen}      options={{ ...headerStyle, headerShown:true, title:'ग्राहक सूची' }} />
            <Stack.Screen name="CreateCustomer" component={CreateCustomerScreen} options={{ ...headerStyle, headerShown:true, title:'नया ग्राहक जोड़ें' }} />
            <Stack.Screen name="CustomerContact" component={CustomerContactScreen} options={{ ...headerStyle, headerShown:true, title:'संपर्क जानकारी' }} />
            <Stack.Screen name="BillNumberSettings" component={BillNumberSettingsScreen} options={{ ...headerStyle, headerShown:true, title:'🧾 Bill Number सेटिंग्स' }} />

            {/* Contact Settings (PIN gated) */}
            <Stack.Screen name="ContactGate"      component={ContactSettingsPinScreen} options={{ ...headerStyle, headerShown:true, title:'Contact Settings' }} />
            <Stack.Screen name="ContactDirectory" component={ContactDirectoryScreen}   options={{ ...headerStyle, headerShown:true, title:'ग्राहक संपर्क' }} />

            {/* Download Tracker (PIN gated) */}
            <Stack.Screen name="DownloadTrackerGate" component={DownloadTrackerGateScreen} options={{ ...headerStyle, headerShown:true, title:'Downloader Tracking' }} />
            <Stack.Screen name="DownloadTrackerList" component={DownloadTrackerListScreen} options={{ ...headerStyle, headerShown:true, title:'📥 डाउनलोडर सूची' }} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
