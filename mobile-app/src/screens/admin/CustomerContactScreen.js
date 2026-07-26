// CustomerContactScreen.js
import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Linking, StyleSheet, ActivityIndicator } from 'react-native';
import { getUserContact } from '../../services/api';
import { Card } from '../../components/UI';
import { COLORS } from '../../theme/colors';

export function CustomerContactScreen({ route }) {
  const { customerId } = route.params;
  const [contact, setContact] = useState(null);

  useEffect(() => { getUserContact(customerId).then(r => setContact(r.contact)).catch(()=>{}); }, []);

  if (!contact) return <View style={{ flex:1, alignItems:'center', justifyContent:'center' }}><ActivityIndicator color={COLORS.blue} /></View>;

  return (
    <View style={{ flex:1, backgroundColor: COLORS.bg, padding: 16 }}>
      <Card>
        <View style={{ flexDirection:'row', alignItems:'center', marginBottom: 16 }}>
          <View style={styles.avatar}><Text style={{ color:'#fff', fontWeight:'800', fontSize:20 }}>{contact.name?.charAt(0)}</Text></View>
          <View><Text style={{ fontWeight:'800', fontSize: 16, color: COLORS.text }}>{contact.name}</Text><Text style={{ color: COLORS.muted }}>@{contact.userId}</Text></View>
        </View>
        {[['📞 फोन', contact.phone, `tel:${contact.phone}`],['📧 ईमेल', contact.email, `mailto:${contact.email}`],['📍 पता', contact.address, null]].map(([l,v,url]) => (
          <TouchableOpacity key={l} onPress={() => url && v && Linking.openURL(url)} style={styles.row}>
            <Text style={styles.label}>{l}</Text>
            <Text style={[styles.val, url && v && { color: COLORS.blue }]}>{v || '—'}</Text>
          </TouchableOpacity>
        ))}
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: { width:48, height:48, borderRadius:24, backgroundColor: COLORS.blue, alignItems:'center', justifyContent:'center', marginRight:12 },
  row:    { flexDirection:'row', justifyContent:'space-between', paddingVertical: 10, borderTopWidth:1, borderColor: COLORS.border },
  label:  { color: COLORS.muted, fontSize: 13 },
  val:    { color: COLORS.text, fontWeight:'600', fontSize: 13, flex:1, textAlign:'right' },
});
