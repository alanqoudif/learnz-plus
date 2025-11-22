import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import { I18nManager, Text } from 'react-native';
import { AppProvider, useApp } from './src/context/AppContext';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
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
import SettingsScreen from './src/screens/SettingsScreen';
import { RootStackParamList } from './src/types';

const Stack = createStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator();

function MainTabs() {
  const { state } = useApp();
  const { colors } = useTheme();
  const userProfile = (state as any)?.userProfile;
  const isAppAdmin = !!userProfile?.isAppAdmin;
  const canAccessCommunity = userProfile?.tier === 'plus' || isAppAdmin;
  const isLeader = userProfile?.role === 'leader';

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.text.secondary,
        tabBarStyle: {
          position: 'absolute',
          bottom: 20,
          left: 20,
          right: 20,
          backgroundColor: 'rgba(255, 255, 255, 0.9)',
          borderRadius: 20,
          height: 65,
          paddingBottom: 8,
          paddingTop: 8,
          borderTopWidth: 0,
          shadowColor: '#000',
          shadowOffset: {
            width: 0,
            height: 4,
          },
          shadowOpacity: 0.15,
          shadowRadius: 12,
          elevation: 8,
        },
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          title: 'الرئيسية',
          tabBarIcon: ({ color, size }) => (
            <Text style={{ fontSize: size, color }}>🏠</Text>
          ),
        }}
      />
      {canAccessCommunity && (
        <Tab.Screen
          name="Community"
          component={CommunityScreen}
          options={{
            title: 'المجتمع',
            tabBarIcon: ({ color, size }) => (
              <Text style={{ fontSize: size, color }}>👥</Text>
            ),
          }}
        />
      )}
      {isLeader && (
        <Tab.Screen
          name="LeaderAdmin"
          component={LeaderAdminScreen}
          options={{
            title: 'إدارة المدرسة',
            tabBarIcon: ({ color, size }) => (
              <Text style={{ fontSize: size, color }}>🏫</Text>
            ),
          }}
        />
      )}
      {isAppAdmin && (
        <Tab.Screen
          name="AppAdmin"
          component={AppAdminScreen}
          options={{
            title: 'إدارة التطبيق',
            tabBarIcon: ({ color, size }) => (
              <Text style={{ fontSize: size, color }}>🛡️</Text>
            ),
          }}
        />
      )}
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          title: 'الإعدادات',
          tabBarIcon: ({ color, size }) => (
            <Text style={{ fontSize: size, color }}>⚙️</Text>
          ),
        }}
      />
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
            <Stack.Screen name="Settings" component={SettingsScreen} />
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

function ThemedAppNavigator() {
  const { isDark } = useTheme();

  return (
    <>
      <AppNavigator />
      <StatusBar style={isDark ? 'light' : 'dark'} />
    </>
  );
}

export default function App() {
  // تفعيل دعم RTL للعربية
  React.useEffect(() => {
    I18nManager.allowRTL(true);
    I18nManager.forceRTL(true);
  }, []);

  return (
    <ThemeProvider>
      <AppProvider>
        <ThemedAppNavigator />
      </AppProvider>
    </ThemeProvider>
  );
}
