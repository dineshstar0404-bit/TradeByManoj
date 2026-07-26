import React from 'react';
import { View, Text, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { Card, Badge, Button } from '../../components/UI';
import { COLORS } from '../../theme/colors';

export default function SettingsScreen({ navigation }) {
  const { user, isAdmin, logout } = useAuth();

  const confirmLogout = () => Alert.alert('लॉग आउट', 'क्या आप लॉग आउट करना चाहते हैं?', [
    { text:'रद्द', style:'cancel' },
    { text:'लॉग आउट', style:'destructive', onPress: logout },
  ]);

  return (
    <View style={{ flex:1, backgroundColor: COLORS.bg, padding: 16 }}>
      {/* Profile */}
      <Card style={{ flexDirection:'row', alignItems:'center', marginBottom: 20 }}>
        <View style={styles.avatar}><Text style={{ color:'#fff', fontWeight:'800', fontSize:22 }}>{user?.name?.charAt(0)}</Text></View>
        <View style={{ flex:1 }}>
          <Text style={{ fontWeight:'800', fontSize:16, color: COLORS.text }}>{user?.name}</Text>
          <Text style={{ color: COLORS.muted }}>@{user?.userId}</Text>
          <View style={{ marginTop: 6 }}>
            <Badge text={isAdmin ? 'Admin' : 'Normal User'} tone={isAdmin ? 'gold' : 'blue'} />
          </View>
        </View>
      </Card>

      {/* Admin-only settings */}
      {isAdmin && (
        <>
          <Text style={styles.section}>Admin Settings</Text>
          {[
            { label:'🔒 ग्राहक संपर्क सेटिंग्स', route:'ContactGate' },
            { label:'📥 सॉफ्टवेयर डाउनलोडर ट्रैकिंग', route:'DownloadTrackerGate' },
          ].map(s => (
            <TouchableOpacity key={s.route} style={styles.settingRow} onPress={() => navigation.navigate(s.route)}>
              <Text style={styles.settingLabel}>{s.label}</Text>
              <Text style={{ color: COLORS.muted }}>›</Text>
            </TouchableOpacity>
          ))}
        </>
      )}

      <Text style={styles.section}>ऐप जानकारी</Text>
      <Card><Text style={{ color: COLORS.muted, fontSize:12 }}>MANOJ TRADERS · v1.0.0{'\n'}जलालपुर, अंबेडकर नगर, उ.प्र.</Text></Card>

      <View style={{ marginTop: 'auto', paddingTop: 20 }}>
        <Button title="🚪 लॉग आउट" variant="danger" onPress={confirmLogout} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  avatar:      { width:54, height:54, borderRadius:27, backgroundColor: COLORS.blue, alignItems:'center', justifyContent:'center', marginRight:14 },
  section:     { fontSize:11, fontWeight:'700', color: COLORS.muted, textTransform:'uppercase', letterSpacing:1, marginBottom:8, marginTop:8 },
  settingRow:  { flexDirection:'row', alignItems:'center', justifyContent:'space-between', backgroundColor: COLORS.white, padding:16, borderRadius:12, borderWidth:1, borderColor: COLORS.border, marginBottom:8 },
  settingLabel:{ fontSize:14, fontWeight:'600', color: COLORS.text },
});
