import React from 'react';
import { StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppProvider, useApp } from './src/context/AppContext';
import { GateScreen } from './src/screens/GateScreen';
import { OnboardingScreen } from './src/screens/OnboardingScreen';
import { ActionScreen } from './src/screens/ActionScreen';
import { AnalyticsScreen } from './src/screens/AnalyticsScreen';
import { CalculatorCoverScreen } from './src/screens/CalculatorCoverScreen';
import { LiquidGlassDock } from './src/components/LiquidGlassDock';
import { PrivacyBlurOverlay } from './src/components/PrivacyBlurOverlay';
import { useAppStatePrivacy } from './src/hooks/useAppStatePrivacy';
import { THEME } from './src/constants/theme';

function MainNavigator() {
  const { currentScreen, activeTab, setActiveTab } = useApp();
  const { isShieldActive } = useAppStatePrivacy({ enabled: true });

  const renderScreen = () => {
    switch (currentScreen) {
      case 'gate':
        return <GateScreen />;
      case 'calculator':
        return <CalculatorCoverScreen />;
      case 'onboarding':
        return <OnboardingScreen />;
      case 'main':
        return (
          <View style={styles.mainContainer}>
            {activeTab === 'action' ? <ActionScreen /> : <AnalyticsScreen />}
            <LiquidGlassDock activeTab={activeTab} onTabChange={setActiveTab} />
          </View>
        );
      default:
        return <GateScreen />;
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar style={currentScreen === 'gate' ? 'dark' : 'light'} />
      {renderScreen()}
      {/* Privacy Shield: Full screen blur overlay when app is in background/multitasking */}
      <PrivacyBlurOverlay visible={isShieldActive} />
    </View>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={styles.gestureRoot}>
      <SafeAreaProvider>
        <AppProvider>
          <MainNavigator />
        </AppProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  gestureRoot: {
    flex: 1,
  },
  root: {
    flex: 1,
    backgroundColor: THEME.colors.background,
  },
  mainContainer: {
    flex: 1,
    position: 'relative',
  },
});
