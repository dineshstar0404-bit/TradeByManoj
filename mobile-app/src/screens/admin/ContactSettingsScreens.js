import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, Switch, Alert, StyleSheet } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { getUsers, updateContactVisibility } from '../../services/api';
import { Card, Button, Input, Badge, ErrorMessage } from '../../components/UI';
import { COLORS } from '../../theme/colors';

// ── PIN Gate ────────────────────────────────────────────────────
export function ContactSettingsPinScreen({ navigation }) {
  const [pin, setPin] = useState('');
  const [err, setErr] = useState('');

  const unlock = () => {
    if (pin === '1234') navigation.replace('ContactDirectory');
    else setErr('गलत पिन — दोबारा कोशिश करें।');
  };

  return (
    <View style={{ flex:1, backgroundColor: COLORS.bg, alignItems:'center', justifyContent:'center', padding: 28 }}>
      <View style={{ width:64, height:64, borderRadius:32, backgroundColor:'#EFF6FF', alignItems:'center', justifyContent:'center', marginBottom:16 }}>
        <Text style={{ fontSize: 28 }}>🔒</Text>
      </View>
      <Text style={{ fontWeight:'800', fontSize:16, color: COLORS.text, marginBottom: 4 }}>ग्राहक संपर्क सेटिंग्स</Text>
      <Text style={{ color: COLORS.muted, fontSize: 12, marginBottom: 24 }}>Demo PIN: 1234</Text>
      <View style={{ width:'100%' }}>
        <Input value={pin} onChangeText={v=>{setPin(v);setErr('');}} keyboardType="number-pad" maxLength={6} secureTextEntry placeholder="• • • •" style={{ textAlign:'center' }} />
        <ErrorMessage message={err} />
        <Button title="अनलॉक करें →" onPress={unlock} />
      </View>
    </View>
  );
}

// ── Directory ────────────────────────────────────────────────────
export function ContactDirectoryScreen() {
  const [customers, setCustomers] = useState([]);
  const [query, setQuery]         = useState('');

  const load = async () => { const r = await getUsers(); setCustomers(r.users||[]); };
  useFocusEffect(useCallback(() => { load(); }, []));

  const toggleVis = async (c) => {
    const next = c.contactVisibility === 'admin_only' ? 'admin_and_self' : 'admin_only';
    try { await updateContactVisibility(c._id, next); load(); } catch (e) { Alert.alert('Error', e.message); }
  };

  const filtered = customers.filter(c =>
    c.name?.toLowerCase().includes(query.toLowerCase()) ||
    c.userId?.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <View style={{ flex:1, backgroundColor: COLORS.bg }}>
      <View style={{ padding: 16, paddingBottom: 8 }}>
        <Input value={query} onChangeText={setQuery} placeholder="🔍 ग्राहक खोजें..." />
      </View>
      <FlatList
        data={filtered}
        keyExtractor={c => c._id}
        contentContainerStyle={{ padding: 16, paddingTop: 0 }}
        ListEmptyComponent={<Text style={{ color: COLORS.muted }}>कोई ग्राहक नहीं मिला।</Text>}
        renderItem={({ item: c }) => (
          <Card>
            <View style={{ flexDirection:'row', alignItems:'center' }}>
              <View style={{ width:38, height:38, borderRadius:19, backgroundColor: COLORS.blue, alignItems:'center', justifyContent:'center', marginRight:10 }}>
                <Text style={{ color:'#fff', fontWeight:'800' }}>{c.name?.charAt(0)}</Text>
              </View>
              <View style={{ flex:1 }}>
                <Text style={{ fontWeight:'700', color: COLORS.text }}>{c.name}</Text>
                <Text style={{ color: COLORS.muted, fontSize: 12 }}>{c.phone||'—'} · {c.email||'—'}</Text>
              </View>
              <Badge text={c.contactVisibility==='admin_and_self'?'Self भी':'Admin Only'} tone={c.contactVisibility==='admin_and_self'?'green':'blue'} />
            </View>
            <View style={{ flexDirection:'row', alignItems:'center', marginTop: 10 }}>
              <Text style={{ flex:1, color: COLORS.muted, fontSize: 12 }}>ग्राहक खुद देख सके</Text>
              <Switch value={c.contactVisibility==='admin_and_self'} onValueChange={() => toggleVis(c)} trackColor={{ true: COLORS.blue }} />
            </View>
          </Card>
        )}
      />
    </View>
  );
}
