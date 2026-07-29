import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, Alert, StyleSheet, Switch } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { getUsers, updateUser, updateContactVisibility } from '../../services/api';
import { Card, Button, Badge, Input } from '../../components/UI';
import { COLORS } from '../../theme/colors';

export default function CustomersScreen({ navigation }) {
  const [customers, setCustomers] = useState([]);
  const [editing,   setEditing]   = useState(null);
  const [draft,     setDraft]     = useState({});
  const [saving,    setSaving]    = useState(false);

  const load = async () => { const r = await getUsers(); setCustomers(r.users||[]); };
  useFocusEffect(useCallback(() => { load(); }, []));

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateUser(editing.id, { name: draft.name, phone: draft.phone, email: draft.email, address: draft.address, ...(draft.password ? { password: draft.password } : {}) });
      const newPassword = draft.password;
      const custName = editing.name;
      setEditing(null); load();
      // Passwords are hashed server-side and can never be viewed again after
      // this point — this is the one chance to see/relay the new password.
      if (newPassword) {
        Alert.alert('✅ पासवर्ड बदल गया', `${custName} का नया पासवर्ड:\n\n${newPassword}\n\nइसे अभी नोट कर लें — यह दोबारा नहीं दिखेगा।`);
      }
    } catch (e) { Alert.alert('Error', e.message); } finally { setSaving(false); }
  };

  const toggleVisibility = async (cust) => {
    const next = cust.contactVisibility === 'admin_only' ? 'admin_and_self' : 'admin_only';
    try { await updateContactVisibility(cust.id, next); load(); } catch (e) { Alert.alert('Error', e.message); }
  };

  if (editing) return (
    <View style={{ flex:1, backgroundColor: COLORS.bg }}>
      <View style={{ padding: 16 }}>
        <Text style={styles.title}>क्रेडेंशियल बदलें — {editing.name}</Text>
        <View style={{ backgroundColor: '#FEF3C7', padding: 12, borderRadius: 10, marginBottom: 14 }}>
          <Text style={{ color: COLORS.goldT, fontSize: 12, fontWeight:'600' }}>⚠️ बदलाव होते ही पुराना पासवर्ड काम करना बंद कर देगा।</Text>
        </View>
        <Input label="नाम" value={draft.name||''} onChangeText={v=>setDraft(d=>({...d,name:v}))} />
        <Input label="फोन" value={draft.phone||''} onChangeText={v=>setDraft(d=>({...d,phone:v}))} keyboardType="phone-pad" />
        <Input label="नया पासवर्ड (खाली छोड़ें अगर नहीं बदलना)" value={draft.password||''} onChangeText={v=>setDraft(d=>({...d,password:v}))} secureToggle />
        <Button title="सेव करें" onPress={handleSave} loading={saving} style={{ marginTop: 8 }} />
        <Button title="रद्द करें" variant="outline" onPress={() => setEditing(null)} style={{ marginTop: 10 }} />
      </View>
    </View>
  );

  return (
    <View style={{ flex:1, backgroundColor: COLORS.bg }}>
      <View style={{ padding: 16, paddingBottom: 8 }}>
        <Button title="+ नया ग्राहक जोड़ें" onPress={() => navigation.navigate('CreateCustomer')} />
      </View>
      <View style={{ backgroundColor:'#FEF3C7', marginHorizontal: 16, padding: 10, borderRadius: 10, marginBottom: 8 }}>
        <Text style={{ color: COLORS.goldT, fontSize: 11, fontWeight:'600' }}>🔒 यह जानकारी सिर्फ Admin Session में दिखती है।</Text>
      </View>
      <FlatList
        data={customers}
        keyExtractor={c => c.id||c.userId}
        contentContainerStyle={{ padding: 16, paddingTop: 0 }}
        ListEmptyComponent={<Text style={styles.muted}>कोई ग्राहक नहीं।</Text>}
        renderItem={({ item: c }) => {
          return (
            <Card>
              {/* Name + avatar */}
              <View style={{ flexDirection:'row', alignItems:'center', marginBottom: 10 }}>
                <View style={styles.avatar}><Text style={{ color:'#fff', fontWeight:'800' }}>{c.name?.charAt(0)}</Text></View>
                <View style={{ flex:1 }}>
                  <Text style={styles.boldText}>{c.name}</Text>
                  <Text style={styles.muted}>@{c.userId}</Text>
                </View>
                <Badge text={c.isActive ? 'Active' : 'Inactive'} tone={c.isActive ? 'green' : 'red'} />
              </View>

              {/* Contact visibility */}
              <View style={[styles.pwRow, { marginTop: 6 }]}>
                <Text style={styles.muted}>खुद अपना contact देख सके</Text>
                <Switch
                  value={c.contactVisibility === 'admin_and_self'}
                  onValueChange={() => toggleVisibility(c)}
                  trackColor={{ true: COLORS.blue }}
                />
              </View>

              {/* Actions */}
              <View style={{ flexDirection:'row', gap: 8, marginTop: 10 }}>
                <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('CustomerContact', { customerId: c.id })}>
                  <Text style={{ color: COLORS.blue, fontWeight:'600', fontSize: 12 }}>📞 Contact</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionBtn} onPress={() => { setEditing(c); setDraft({ name: c.name, phone: c.phone||'', email: c.email||'' }); }}>
                  <Text style={{ color: COLORS.blue, fontWeight:'600', fontSize: 12 }}>✏️ Edit / पासवर्ड</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('CreateBill', { presetCustomerId: c.id })}>
                  <Text style={{ color: COLORS.blue, fontWeight:'600', fontSize: 12 }}>🧾 Bill</Text>
                </TouchableOpacity>
              </View>
            </Card>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  title:     { fontSize: 16, fontWeight:'800', color: COLORS.text, marginBottom: 12 },
  muted:     { fontSize: 12, color: COLORS.muted },
  boldText:  { fontWeight:'700', color: COLORS.text },
  avatar:    { width: 38, height: 38, borderRadius: 19, backgroundColor: COLORS.blue, alignItems:'center', justifyContent:'center', marginRight: 10 },
  pwRow:     { flexDirection:'row', alignItems:'center', backgroundColor: COLORS.bg, padding: 10, borderRadius: 8 },
  actionBtn: { flex:1, padding: 8, borderWidth:1, borderColor: COLORS.border, borderRadius: 8, alignItems:'center' },
});
