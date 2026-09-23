import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import DoctorScreen from './src/DoctorScreen';

export default function App() {
  return (
    <SafeAreaProvider>
      <DoctorScreen />
      <StatusBar style="dark" />
    </SafeAreaProvider>
  );
}
