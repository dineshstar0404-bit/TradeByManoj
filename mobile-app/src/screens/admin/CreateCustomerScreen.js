import React, { useState } from 'react';
import { View, ScrollView, Alert } from 'react-native';
import { createUser } from '../../services/api';
import { Card, Button, Input, ErrorMessage } from '../../components/UI';
import { COLORS } from '../../theme/colors';

export default function CreateCustomerScreen({ navigation }) {
  const [f, setF] = useState({ userId:'', password:'', name:'', phone:'', email:'', address:'' });
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState('');
  const u = k => v => setF(s => ({ ...s, [k]: v }));

  const submit = async () => {
    if (!f.userId.trim() || !f.password || !f.name.trim()) { setError('User ID, पासवर्ड और नाम ज़रूरी हैं।'); return; }
    setSaving(true); setError('');
    try {
      await createUser({ userId: f.userId.trim(), password: f.password, name: f.name.trim(), phone: f.phone, email: f.email, address: f.address });
      Alert.alert('✅ सफल', `${f.name} का अकाउंट बन गया!`, [{ text:'ठीक है', onPress:() => navigation.goBack() }]);
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  };

  return (
    <ScrollView style={{ flex:1, backgroundColor: COLORS.bg }} contentContainerStyle={{ padding: 20 }}>
      <Card>
        <Input label="ग्राहक का नाम *" value={f.name} onChangeText={u('name')} />
        <View style={{ flexDirection:'row', gap: 10 }}>
          <View style={{ flex:1 }}><Input label="User ID *" value={f.userId} onChangeText={u('userId')} autoCapitalize="none" /></View>
          <View style={{ flex:1 }}><Input label="पासवर्ड *" value={f.password} onChangeText={u('password')} secureToggle /></View>
        </View>
        <Input label="फोन" value={f.phone}   onChangeText={u('phone')}   keyboardType="phone-pad" />
        <Input label="ईमेल" value={f.email}  onChangeText={u('email')}   keyboardType="email-address" autoCapitalize="none" />
        <Input label="पता"  value={f.address} onChangeText={u('address')} />
        <ErrorMessage message={error} />
        <Button title="ग्राहक बनाएं" onPress={submit} loading={saving} />
      </Card>
    </ScrollView>
  );
}
