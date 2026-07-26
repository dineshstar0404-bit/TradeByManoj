import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, StyleSheet, FlatList } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { getItems, createItem, updateItem, deleteItem } from '../../services/api';
import { Card, Button, Input, Badge, ErrorMessage } from '../../components/UI';
import { COLORS } from '../../theme/colors';

const INR = n => '₹' + Number(n||0).toLocaleString('en-IN');
const fKg = k => { const g = Math.round((k||0)*1000); return g >= 1000 ? `${k?.toFixed(2)} kg` : `${g} gm`; };

export default function StockScreen() {
  const [items,    setItems]    = useState([]);
  const [tab,      setTab]      = useState('stock');
  const [showAdd,  setShowAdd]  = useState(false);
  const [editing,  setEditing]  = useState(null);
  const [newItem,  setNewItem]  = useState({ name:'', quantity:'', pricePerUnit:'' });
  const [error,    setError]    = useState('');
  const [saving,   setSaving]   = useState(false);

  const load = async () => { const r = await getItems(); setItems(r.items||[]); };
  useFocusEffect(useCallback(() => { load(); }, []));

  const handleAdd = async () => {
    if (!newItem.name.trim()) { setError('नाम ज़रूरी है।'); return; }
    setSaving(true);
    try {
      await createItem({ name: newItem.name.trim(), unit:'KG', quantity: Number(newItem.quantity)||0, pricePerUnit: Number(newItem.pricePerUnit)||0 });
      setNewItem({ name:'', quantity:'', pricePerUnit:'' }); setShowAdd(false); setError(''); load();
    } catch (e) { setError(e.message); } finally { setSaving(false); }
  };

  const handleUpdate = async (item, qty, price) => {
    try {
      await updateItem(item._id, { quantity: Number(qty), pricePerUnit: Number(price) });
      setEditing(null); load();
    } catch (e) { Alert.alert('Error', e.message); }
  };

  const handleDelete = (item) => {
    Alert.alert('हटाएं', `${item.name} को हटाएं?`, [
      { text:'रद्द', style:'cancel' },
      { text:'हटाएं', style:'destructive', onPress: async () => { await deleteItem(item._id); load(); } },
    ]);
  };

  const totalKg  = items.reduce((s,i) => s + (i.quantity||0), 0);
  const totalVal = items.reduce((s,i) => s + (i.quantity||0)*(i.pricePerUnit||0), 0);

  return (
    <View style={{ flex:1, backgroundColor: COLORS.bg }}>
      {/* Summary */}
      <View style={styles.summary}>
        {[{l:'वस्तुएं',v:items.length},{l:'कुल स्टॉक',v:fKg(totalKg)},{l:'मूल्य',v:INR(totalVal)}].map(s=>(
          <View key={s.l} style={styles.sumCard}><Text style={styles.sumLabel}>{s.l}</Text><Text style={styles.sumVal}>{s.v}</Text></View>
        ))}
      </View>

      {/* Tab */}
      <View style={styles.tabRow}>
        {[{k:'stock',l:'📦 स्टॉक'},{k:'add',l:'➕ जोड़ें'}].map(t=>(
          <TouchableOpacity key={t.k} style={[styles.tab, tab===t.k && styles.tabActive]} onPress={() => setTab(t.k)}>
            <Text style={{ color: tab===t.k ? '#fff' : COLORS.muted, fontWeight:'600', fontSize:13 }}>{t.l}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={{ padding: 16 }}>
        {tab === 'add' && (
          <Card>
            <Text style={styles.sectionTitle}>नई वस्तु जोड़ें</Text>
            <Input label="वस्तु का नाम" value={newItem.name} onChangeText={v=>setNewItem(s=>({...s,name:v}))} placeholder="जैसे: गेहूं (Wheat)" />
            <View style={{ flexDirection:'row', gap: 10 }}>
              <View style={{ flex:1 }}><Input label="मात्रा (KG)" value={newItem.quantity} onChangeText={v=>setNewItem(s=>({...s,quantity:v}))} keyboardType="decimal-pad" placeholder="0" /></View>
              <View style={{ flex:1 }}><Input label="दर/KG (₹)" value={newItem.pricePerUnit} onChangeText={v=>setNewItem(s=>({...s,pricePerUnit:v}))} keyboardType="decimal-pad" placeholder="0" /></View>
            </View>
            <ErrorMessage message={error} />
            <Button title="स्टॉक में जोड़ें" onPress={handleAdd} loading={saving} />
          </Card>
        )}

        {tab === 'stock' && items.map(item => {
          const isLow = (item.quantity||0) < 50;
          const ed = editing === item._id;
          const [draftQty,   setDQ] = [item._draftQty||String(item.quantity||''), v => { item._draftQty = v; setItems(p=>[...p]); }];
          const [draftPrice, setDP] = [item._draftPrice||String(item.pricePerUnit||''), v => { item._draftPrice = v; setItems(p=>[...p]); }];
          return (
            <Card key={item._id}>
              <View style={styles.itemRow}>
                <View style={{ flex:1 }}>
                  <View style={{ flexDirection:'row', alignItems:'center', gap: 6, marginBottom: 4 }}>
                    <Text style={styles.boldText}>{item.name}</Text>
                    {isLow && <Badge text="⚠️ कम" tone="red" />}
                  </View>
                  {ed ? (
                    <View style={{ flexDirection:'row', gap: 8 }}>
                      <Input value={item._draftQty||String(item.quantity)} onChangeText={v=>{item._draftQty=v;setItems(p=>[...p]);}} keyboardType="decimal-pad" placeholder="KG" style={{ flex:1, marginBottom:0 }} />
                      <Input value={item._draftPrice||String(item.pricePerUnit)} onChangeText={v=>{item._draftPrice=v;setItems(p=>[...p]);}} keyboardType="decimal-pad" placeholder="₹/KG" style={{ flex:1, marginBottom:0 }} />
                    </View>
                  ) : (
                    <Text style={styles.muted}>{fKg(item.quantity)} · {INR(item.pricePerUnit)}/kg · {INR((item.quantity||0)*(item.pricePerUnit||0))}</Text>
                  )}
                </View>
                <View style={{ flexDirection:'row', gap: 6, marginLeft: 8 }}>
                  {ed ? (
                    <TouchableOpacity style={[styles.iconBtn,{backgroundColor: COLORS.green}]} onPress={() => handleUpdate(item, item._draftQty||item.quantity, item._draftPrice||item.pricePerUnit)}>
                      <Text style={{ color:'#fff', fontWeight:'700' }}>✓</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity style={styles.iconBtn} onPress={() => setEditing(item._id)}>
                      <Text style={{ color: COLORS.blue }}>✏️</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity style={[styles.iconBtn,{ borderColor:'#FECACA' }]} onPress={() => handleDelete(item)}>
                    <Text style={{ color: COLORS.red }}>🗑️</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </Card>
          );
        })}
        <View style={{ height: 30 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  summary:      { flexDirection:'row', padding: 16, gap: 10, backgroundColor: COLORS.white, borderBottomWidth:1, borderColor: COLORS.border },
  sumCard:      { flex:1, alignItems:'center', padding: 10, backgroundColor: COLORS.bg, borderRadius: 10 },
  sumLabel:     { fontSize: 10, color: COLORS.muted, fontWeight:'600' },
  sumVal:       { fontSize: 13, fontWeight:'700', color: COLORS.text, marginTop: 2 },
  tabRow:       { flexDirection:'row', padding: 12, gap: 8 },
  tab:          { flex:1, padding: 10, alignItems:'center', borderRadius: 10, backgroundColor: COLORS.bg, borderWidth:1, borderColor: COLORS.border },
  tabActive:    { backgroundColor: COLORS.blue, borderColor: COLORS.blue },
  sectionTitle: { fontWeight:'800', color: COLORS.text, marginBottom: 14, fontSize: 15 },
  itemRow:      { flexDirection:'row', alignItems:'center', justifyContent:'space-between' },
  boldText:     { fontWeight:'700', color: COLORS.text },
  muted:        { color: COLORS.muted, fontSize: 12, marginTop: 2 },
  iconBtn:      { width: 34, height: 34, borderWidth:1, borderColor: COLORS.border, borderRadius: 8, alignItems:'center', justifyContent:'center' },
});
