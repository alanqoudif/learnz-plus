import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';
import { I18nManager } from 'react-native';
import { AppProvider, useApp } from './src/context/AppContext';
import LoginScreen from './src/screens/LoginScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import AddClassScreen from './src/screens/AddClassScreen';
import StudentManagementScreen from './src/screens/StudentManagementScreen';
import AttendanceScreen from './src/screens/AttendanceScreen';
import AttendanceHistoryScreen from './src/screens/AttendanceHistoryScreen';
import { RootStackParamList } from './src/types';

const Stack = createStackNavigator<RootStackParamList>();

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
            <Stack.Screen name="Dashboard" component={DashboardScreen} />
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
