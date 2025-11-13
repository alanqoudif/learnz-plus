import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import { I18nManager } from 'react-native';
import { AppProvider, useApp } from './src/context/AppContext';
import LoginScreen from './src/screens/LoginScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import AddClassScreen from './src/screens/AddClassScreen';
import StudentManagementScreen from './src/screens/StudentManagementScreen';
import AttendanceScreen from './src/screens/AttendanceScreen';
import AttendanceHistoryScreen from './src/screens/AttendanceHistoryScreen';
import CommunityScreen from './src/screens/CommunityScreen';
import JoinSchoolScreen from './src/screens/JoinSchoolScreen';
import LeaderAdminScreen from './src/screens/LeaderAdminScreen';
import AppAdminScreen from './src/screens/AppAdminScreen';
import { RootStackParamList } from './src/types';

const Stack = createStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator();

function MainTabs() {
  const { state } = useApp();
  const userProfile = (state as any)?.userProfile;
  const isAppAdmin = !!userProfile?.isAppAdmin;
  const canAccessCommunity = userProfile?.tier === 'plus' || isAppAdmin;
  const isLeader = userProfile?.role === 'leader';

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} options={{ title: 'الرئيسية' }} />
      {canAccessCommunity && (
        <Tab.Screen name="Community" component={CommunityScreen} options={{ title: 'المجتمع' }} />
      )}
      {isLeader && (
        <Tab.Screen name="LeaderAdmin" component={LeaderAdminScreen} options={{ title: 'إدارة المدرسة' }} />
      )}
      {isAppAdmin && (
        <Tab.Screen name="AppAdmin" component={AppAdminScreen} options={{ title: 'إدارة التطبيق' }} />
      )}
    </Tab.Navigator>
  );
}

function AppNavigator() {
  const { state } = useApp();

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          gestureEnabled: true,
          gestureDirection: 'horizontal',
        }}
      >
        {state.currentTeacher ? (
          // المستخدم مسجل دخول
          <>
            <Stack.Screen name="Dashboard" component={MainTabs} />
            <Stack.Screen name="Community" component={CommunityScreen} />
            <Stack.Screen name="JoinSchool" component={JoinSchoolScreen} />
            <Stack.Screen name="LeaderAdmin" component={LeaderAdminScreen} />
            <Stack.Screen name="AppAdmin" component={AppAdminScreen} />
            <Stack.Screen name="AddClass" component={AddClassScreen} />
            <Stack.Screen name="StudentManagement" component={StudentManagementScreen} />
            <Stack.Screen name="Attendance" component={AttendanceScreen} />
            <Stack.Screen name="AttendanceHistory" component={AttendanceHistoryScreen} />
          </>
        ) : (
          // المستخدم غير مسجل دخول
          <Stack.Screen name="Login" component={LoginScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  // تفعيل دعم RTL للعربية
  React.useEffect(() => {
    I18nManager.allowRTL(true);
    I18nManager.forceRTL(true);
  }, []);

  return (
    <AppProvider>
      <AppNavigator />
      <StatusBar style="auto" />
    </AppProvider>
  );
}
