import React, { useState } from 'react';
import { View, Text, TouchableOpacity, KeyboardAvoidingView, Platform, Alert, ScrollView, StyleSheet } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { Input, Button, ErrorMessage } from '../components/UI';
import { COLORS } from '../theme/colors';

export default function LoginScreen() {
  const { login } = useAuth();
  const [userId,   setUserId]   = useState('');
  const [password, setPassword] = useState('');
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');

  const handleLogin = async () => {
    if (!userId.trim() || !password) { setError('यूज़र आईडी और पासवर्ड दोनों भरें।'); return; }
    setLoading(true); setError('');
    try {
      await login(userId.trim(), password);
    } catch (err) {
      setError(err.message || 'गलत यूज़र आईडी या पासवर्ड।');
    } finally { setLoading(false); }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logo}><Text style={{ color: '#fff', fontWeight: '800', fontSize: 26 }}>M</Text></View>
          <Text style={styles.title}>मनोज ट्रेडर्स</Text>
          <Text style={styles.subtitle}>MANOJ TRADERS</Text>
        </View>

        <View style={styles.form}>
          <Input label="यूज़र आईडी" value={userId} onChangeText={setUserId} autoCapitalize="none" placeholder="userId" />
          <Input label="पासवर्ड" value={password} onChangeText={setPassword} secureToggle placeholder="••••••••" />
          <ErrorMessage message={error} />
          <Button title="लॉगिन करें" onPress={handleLogin} loading={loading} style={{ marginTop: 6 }} />
          <Text style={styles.hint}>एडमिन और हर ग्राहक का अपना अलग login होता है।</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: { backgroundColor: COLORS.blue, paddingTop: 80, paddingBottom: 50, alignItems: 'center', borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  logo:   { width: 64, height: 64, borderRadius: 32, backgroundColor: COLORS.gold, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  title:  { color: '#fff', fontSize: 24, fontWeight: '800' },
  subtitle: { color: '#BFDBFE', fontSize: 11, letterSpacing: 2, marginTop: 4 },
  form:   { padding: 24, marginTop: 8 },
  hint:   { fontSize: 11, color: COLORS.muted, textAlign: 'center', marginTop: 16, lineHeight: 18 },
});
