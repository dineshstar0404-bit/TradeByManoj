import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Alert, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { getBill, updateBill, deleteBill } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { Card, Badge, Button, Input, ErrorMessage } from '../../components/UI';
import { COLORS } from '../../theme/colors';

const INR = n => '₹' + Number(n||0).toLocaleString('en-IN');

export default function BillDetailScreen({ route, navigation }) {
  const { billId } = route.params;
  const { isAdmin } = useAuth();
  const [bill,    setBill]    = useState(null);
  const [editing, setEditing] = useState(false);
  const [draft,   setDraft]   = useState({});
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState('');

  useEffect(() => {
    getBill(billId).then(r => {
      setBill(r.bill);
      setDraft({ laborCharge: r.bill.laborCharge||0, transportCharge: r.bill.transportCharge||0, claim: r.bill.claim||0, paidAmount: r.bill.paidAmount||0, notes: r.bill.notes||'' });
    }).catch(() => Alert.alert('Error','Bill not found'));
  }, [billId]);

  const handleSync = async () => {
    setSaving(true); setError('');
    try {
      const res = await updateBill(billId, { ...draft, syncedAt: new Date().toISOString() });
      setBill(res.bill); setEditing(false);
      Alert.alert('✅ Synced','Bill charges updated and synced to customer.');
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  };

  const handleDelete = () => {
    Alert.alert('बिल हटाएं', 'क्या आप वाकई इस बिल को हटाना चाहते हैं?', [
      { text: 'रद्द', style: 'cancel' },
      { text: 'हटाएं', style: 'destructive', onPress: async () => {
        await deleteBill(billId);
        navigation.goBack();
      }},
    ]);
  };

  if (!bill) return <View style={{ flex:1, backgroundColor: COLORS.bg }} />;

  const it = bill.items?.[0] || {};
  const balance = Math.max((bill.totalAmount||0) - (bill.paidAmount||0), 0);
  const tone = bill.status === 'paid' ? 'green' : bill.status === 'partial' ? 'gold' : 'red';

  return (
    <ScrollView style={styles.container}>
      <View style={{ padding: 16 }}>
        {/* DICTO Banner */}
        <View style={[styles.banner, bill.syncedAt ? styles.bannerGreen : styles.bannerBlue]}>
          <Text style={{ fontSize: 12, fontWeight: '700', color: bill.syncedAt ? COLORS.green : COLORS.blue }}>
            ✦ {bill.syncedAt ? `DICTO VERIFIED · Synced ${new Date(bill.syncedAt).toLocaleDateString('en-IN')}` : 'DICTO MIRROR — Live'} · {isAdmin ? '🔑 Admin' : '👤 Customer'}
          </Text>
        </View>

        {/* Header */}
        <Card>
          <View style={styles.row}>
            <View>
              {isAdmin && <Text style={styles.bold}>{bill.customer?.name}</Text>}
              <Text style={styles.muted}>बिल: {new Date(bill.billDate).toLocaleDateString('hi-IN', { year:'numeric', month:'long', day:'numeric' })}</Text>
            </View>
            <Badge text={bill.status === 'paid' ? '✅ Paid' : bill.status === 'partial' ? '⏳ Partial' : '🔴 Pending'} tone={tone} />
          </View>
        </Card>

        {/* Item Breakdown */}
        <Card>
          <Text style={styles.section}>📦 वस्तु विवरण</Text>
          <Text style={[styles.bold, { marginBottom: 8 }]}>{it.name}</Text>
          {(it.grossWeightKg > 0) && <View style={styles.row}><Text style={styles.muted}>Gross Weight</Text><Text style={styles.val}>{it.grossWeightKg?.toFixed(2)} kg</Text></View>}
          {(it.deductionPct > 0) && <View style={styles.row}><Text style={styles.muted}>Deduction {it.deductionPct}%</Text><Text style={[styles.val, { color: COLORS.red }]}>− {it.deductionAmt?.toFixed(3)} kg</Text></View>}
          <View style={styles.row}><Text style={styles.muted}>Net Weight</Text><Text style={styles.val}>{it.weightKg?.toFixed(3)} kg</Text></View>
          <View style={styles.row}><Text style={styles.muted}>Rate / KG</Text><Text style={styles.val}>{INR(it.ratePerKg)}</Text></View>
          <View style={[styles.row, styles.borderTop]}><Text style={styles.bold}>वस्तु राशि</Text><Text style={styles.bold}>{INR(it.amount)}</Text></View>
        </Card>

        {/* Deductions — editable by admin */}
        <Card>
          <Text style={styles.section}>➖ कटौतियाँ</Text>
          {isAdmin && editing ? (
            <>
              {[['laborCharge','लेबर चार्ज'],['transportCharge','ट्रांसपोर्ट'],['claim','क्लेम/डिस्काउंट']].map(([k,l]) => (
                <Input key={k} label={l} value={String(draft[k]||'')} onChangeText={v => setDraft(d=>({...d,[k]:Number(v)||0}))} keyboardType="numeric" />
              ))}
            </>
          ) : (
            <>
              {[['लेबर चार्ज', bill.laborCharge],['ट्रांसपोर्ट', bill.transportCharge],['क्लेम/डिस्काउंट', bill.claim]].map(([l,v]) => (
                <View key={l} style={styles.row}><Text style={styles.muted}>{l}</Text><Text style={[styles.val, { color: v>0 ? COLORS.red : COLORS.muted }]}>− {INR(v||0)}</Text></View>
              ))}
            </>
          )}
        </Card>

        {/* Payment Summary */}
        <Card style={{ backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' }}>
          <Text style={styles.section}>💰 भुगतान सारांश</Text>
          <View style={styles.row}><Text style={styles.muted}>वस्तु राशि</Text><Text style={styles.val}>{INR(bill.itemAmount)}</Text></View>
          <View style={[styles.row, styles.borderTop]}>
            <Text style={styles.bold}>Grand Total</Text>
            <Text style={[styles.bold, { fontSize: 18, color: COLORS.blue }]}>{INR(bill.totalAmount)}</Text>
          </View>
          {isAdmin && editing ? (
            <Input label="भुगतान राशि" value={String(draft.paidAmount||'')} onChangeText={v => setDraft(d=>({...d,paidAmount:Number(v)||0}))} keyboardType="numeric" style={{ marginTop: 8 }} />
          ) : (
            <View style={[styles.row, styles.borderTop]}>
              <Text style={styles.muted}>भुगतान राशि</Text><Text style={styles.val}>{INR(bill.paidAmount)}</Text>
            </View>
          )}
          <View style={styles.row}>
            <Text style={styles.bold}>बकाया राशि</Text>
            <Text style={[styles.bold, { color: balance > 0 ? COLORS.red : COLORS.green }]}>
              {balance > 0 ? INR(balance) : '✅ पूरा भुगतान'}
            </Text>
          </View>
        </Card>

        {/* Notes */}
        {(bill.notes || (isAdmin && editing)) && (
          <Card style={{ backgroundColor: '#FFFBEB' }}>
            <Text style={styles.section}>📝 नोट्स</Text>
            {isAdmin && editing
              ? <Input value={draft.notes} onChangeText={v => setDraft(d=>({...d,notes:v}))} placeholder="Admin notes..." />
              : <Text style={{ color: COLORS.text, lineHeight: 20 }}>{bill.notes}</Text>
            }
          </Card>
        )}

        {/* Photo */}
        {bill.image?.url && (
          <Card>
            <Text style={styles.section}>📎 बिल फोटो</Text>
            <TouchableOpacity onPress={() => Linking.openURL(bill.image.url)} style={styles.photoBtn}>
              <Text style={{ color: COLORS.blue, fontWeight: '700' }}>
                {bill.image.type === 'cloudinary' ? '📷 फोटो देखें' : '🔗 Google Drive पर देखें'}
              </Text>
            </TouchableOpacity>
          </Card>
        )}

        <ErrorMessage message={error} />

        {/* Admin actions */}
        {isAdmin && !editing && <Button title="✏️ Edit & Sync to Customer" onPress={() => setEditing(true)} variant="outline" style={{ marginBottom: 10, borderColor: COLORS.gold }} />}
        {isAdmin && editing && (
          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 10 }}>
            <Button title="रद्द करें" variant="outline" onPress={() => setEditing(false)} style={{ flex: 1 }} />
            <Button title="✅ Sync Now" onPress={handleSync} loading={saving} style={{ flex: 1, backgroundColor: COLORS.green }} />
          </View>
        )}
        <Button title="🖨️ Print / Share" variant="outline" onPress={() => Alert.alert('Print','Production app mein print/share kaam karega.')} style={{ marginBottom: 10 }} />
        {isAdmin && <Button title="🗑️ बिल हटाएं" variant="danger" onPress={handleDelete} />}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  banner: { padding: 10, borderRadius: 10, marginBottom: 10 },
  bannerGreen: { backgroundColor: '#F0FDF4', borderWidth: 1, borderColor: '#86EFAC' },
  bannerBlue:  { backgroundColor: '#EFF6FF', borderWidth: 1, borderColor: '#BFDBFE' },
  section:  { fontSize: 11, fontWeight: '700', color: COLORS.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 },
  row:      { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  borderTop:{ borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 8, marginTop: 4 },
  bold:     { fontWeight: '700', color: COLORS.text },
  muted:    { color: COLORS.muted, fontSize: 13 },
  val:      { fontWeight: '600', color: COLORS.text, fontSize: 13 },
  photoBtn: { padding: 12, borderWidth: 1, borderColor: COLORS.blue, borderRadius: 10, alignItems: 'center' },
});
