import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import { I18nManager, Platform } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { AppProvider, useApp } from './src/context/AppContext';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import LoginScreen from './src/screens/LoginScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import AddClassScreen from './src/screens/AddClassScreen';
import StudentManagementScreen from './src/screens/StudentManagementScreen';
import StudentsScreen from './src/screens/StudentsScreen';
import AttendanceScreen from './src/screens/AttendanceScreen';
import AttendanceHistoryScreen from './src/screens/AttendanceHistoryScreen';
import CommunityScreen from './src/screens/CommunityScreen';
import JoinSchoolScreen from './src/screens/JoinSchoolScreen';
import LeaderAdminScreen from './src/screens/LeaderAdminScreen';
import AppAdminScreen from './src/screens/AppAdminScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import TeacherManagementScreen from './src/screens/TeacherManagementScreen';
import SchoolReportsScreen from './src/screens/SchoolReportsScreen';
import { RootStackParamList } from './src/types';

const Stack = createStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator();

function MainTabs() {
  const { state } = useApp();
  const { colors, isDark } = useTheme();
  const userProfile = (state as any)?.userProfile;
  const showSchoolManagementTab = Boolean(userProfile?.schoolId) && userProfile?.role === 'leader';

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.text.muted || colors.text.secondary,
        tabBarStyle: {
          position: 'absolute',
          left: 16,
          right: 16,
          bottom: 16,
          backgroundColor: colors.background.glass || 'rgba(255,255,255,0.9)',
          borderRadius: 28,
          height: 64,
          paddingHorizontal: 12,
          paddingBottom: Platform.OS === 'ios' ? 14 : 8,
          paddingTop: 8,
          borderTopWidth: 0,
          borderWidth: isDark ? 0 : 1,
          borderColor: isDark ? 'transparent' : colors.border.light,
          shadowColor: isDark ? '#000' : '#2C2C2C',
          shadowOffset: {
            width: 0,
            height: 8,
          },
          shadowOpacity: 0.15,
          shadowRadius: 16,
          elevation: 12,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginBottom: Platform.OS === 'ios' ? 0 : 2,
        },
        tabBarHideOnKeyboard: true,
      }}
    >
      <Tab.Screen
        name="AttendanceHome"
        component={DashboardScreen}
        options={{
          title: 'الحضور',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="calendar-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Students"
        component={StudentsScreen}
        options={{
          title: 'الطلاب',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-circle-outline" size={size} color={color} />
          ),
        }}
      />
      {showSchoolManagementTab && (
        <Tab.Screen
          name="SchoolManagement"
          component={LeaderAdminScreen}
          options={{
            title: 'إدارة المدرسة',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="business-outline" size={size} color={color} />
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
            <Ionicons name="settings" size={size} color={color} />
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
            <Stack.Screen name="TeacherManagement" component={TeacherManagementScreen} />
            <Stack.Screen name="SchoolReports" component={SchoolReportsScreen} />
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
    <SafeAreaProvider>
      <ThemeProvider>
        <AppProvider>
          <ThemedAppNavigator />
        </AppProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
