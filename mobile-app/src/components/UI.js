import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, StyleSheet, Switch } from 'react-native';
import { COLORS } from '../theme/colors';

// ── Card ────────────────────────────────────────────────────────
export function Card({ children, style }) {
  return (
    <View style={[{ backgroundColor: COLORS.white, borderRadius: 14, borderWidth: 1, borderColor: COLORS.border, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 }, style]}>
      {children}
    </View>
  );
}

// ── Badge ────────────────────────────────────────────────────────
export function Badge({ text, tone = 'blue' }) {
  const colors = { blue: ['#EFF6FF', COLORS.blue], green: ['#DCFCE7', COLORS.green], red: ['#FEE2E2', COLORS.red], gold: ['#FEF3C7', COLORS.goldT] };
  const [bg, fg] = colors[tone] || colors.blue;
  return <View style={{ backgroundColor: bg, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, alignSelf: 'flex-start' }}><Text style={{ color: fg, fontSize: 11, fontWeight: '700' }}>{text}</Text></View>;
}

// ── Button ───────────────────────────────────────────────────────
export function Button({ title, onPress, variant = 'primary', loading, disabled, style }) {
  const dis = disabled || loading;
  const bg  = variant === 'danger' ? '#FEE2E2' : variant === 'outline' ? 'transparent' : COLORS.blue;
  const fg  = variant === 'danger' ? COLORS.red : variant === 'outline' ? COLORS.blue : '#fff';
  const border = variant === 'outline' ? { borderWidth: 1, borderColor: COLORS.blue } : variant === 'danger' ? { borderWidth: 1, borderColor: '#FECACA' } : {};
  return (
    <TouchableOpacity onPress={onPress} disabled={dis} style={[{ backgroundColor: bg, paddingVertical: 13, borderRadius: 12, alignItems: 'center', justifyContent: 'center', opacity: dis ? 0.5 : 1 }, border, style]}>
      {loading ? <ActivityIndicator color={fg} /> : <Text style={{ color: fg, fontWeight: '700', fontSize: 14 }}>{title}</Text>}
    </TouchableOpacity>
  );
}

// ── Input ────────────────────────────────────────────────────────
export function Input({ label, secureToggle, style, ...props }) {
  const [secure, setSecure] = useState(!!secureToggle);
  return (
    <View style={[{ marginBottom: 14 }, style]}>
      {label && <Text style={{ fontSize: 12, color: COLORS.muted, marginBottom: 6, fontWeight: '600' }}>{label}</Text>}
      <View style={{ flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, paddingHorizontal: 14, backgroundColor: COLORS.white }}>
        <TextInput {...props} secureTextEntry={secureToggle ? secure : props.secureTextEntry} placeholderTextColor="#9CA3AF" style={{ flex: 1, paddingVertical: 12, fontSize: 14, color: COLORS.text }} />
        {secureToggle && <TouchableOpacity onPress={() => setSecure(s => !s)}><Text style={{ color: COLORS.muted, fontSize: 12 }}>{secure ? 'दिखाएं' : 'छिपाएं'}</Text></TouchableOpacity>}
      </View>
    </View>
  );
}

// ── Divider ──────────────────────────────────────────────────────
export function Divider() {
  return <View style={{ height: 1, backgroundColor: COLORS.border, marginVertical: 12 }} />;
}

// ── SectionHeader ────────────────────────────────────────────────
export function SectionHeader({ title }) {
  return <Text style={{ fontSize: 13, fontWeight: '700', color: COLORS.muted, marginBottom: 8, marginTop: 4 }}>{title}</Text>;
}

// ── LoadingScreen ────────────────────────────────────────────────
export function LoadingScreen() {
  return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.bg }}><ActivityIndicator size="large" color={COLORS.blue} /></View>;
}

// ── ErrorMessage ─────────────────────────────────────────────────
export function ErrorMessage({ message }) {
  if (!message) return null;
  return <Text style={{ color: COLORS.red, fontSize: 12, fontWeight: '600', marginBottom: 10 }}>{message}</Text>;
}
