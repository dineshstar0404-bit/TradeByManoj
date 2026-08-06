import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Alert, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { getBill, updateBill, deleteBill, getItems, addBillPayment, removeBillPayment } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { Card, Badge, Button, Input, ErrorMessage } from '../../components/UI';
import { COLORS } from '../../theme/colors';
import { buildAndShareInvoicePdf } from '../../utils/invoicePdf';

const INR = n => '₹' + Number(n||0).toLocaleString('en-IN');
const uid = () => Math.random().toString(36).slice(2,8);
const today = () => new Date().toISOString().slice(0,10);
const PAYMENT_MODES = [['cash','नकद'],['upi','UPI'],['bank','बैंक'],['other','अन्य']];
const MODE_LABEL = Object.fromEntries(PAYMENT_MODES);

export default function BillDetailScreen({ route, navigation }) {
  const { billId } = route.params;
  const { isAdmin } = useAuth();
  const [bill,       setBill]       = useState(null);
  const [editing,    setEditing]    = useState(false);
  const [draft,      setDraft]      = useState({});
  const [itemsDraft, setItemsDraft] = useState([]);
  const [stockItems, setStockItems] = useState([]);
  const [picking,    setPicking]    = useState(false);
  const [saving,     setSaving]     = useState(false);
  const [error,      setError]      = useState('');

  const [addingPayment, setAddingPayment] = useState(false);
  const [payForm,       setPayForm]       = useState({ amount:'', date: today(), mode:'cash', note:'' });
  const [paySaving,     setPaySaving]     = useState(false);
  const [payError,      setPayError]      = useState('');

  useEffect(() => {
    getBill(billId).then(r => {
      setBill(r.bill);
      setDraft({ laborCharge: r.bill.laborCharge||0, transportCharge: r.bill.transportCharge||0, claim: r.bill.claim||0, notes: r.bill.notes||'' });
    }).catch(() => Alert.alert('Error','Bill not found'));
  }, [billId]);

  const startEditing = () => {
    setItemsDraft((bill.items||[]).map(li => ({ ...li, id: uid() })));
    setEditing(true);
    if (stockItems.length === 0) getItems().then(r => setStockItems(r.items||[])).catch(()=>{});
  };

  const updateLine = (id, patch) => setItemsDraft(p => p.map(li => {
    if (li.id !== id) return li;
    const next = { ...li, ...patch };
    const gross = (Number(next.weightKg)||0) * (Number(next.ratePerKg)||0);
    next.claimAmt = gross * ((Number(next.claimPct)||0) / 100);
    next.amount = Math.max(gross - next.claimAmt, 0);
    return next;
  }));

  const removeLine = (id) => {
    if (itemsDraft.length <= 1) { Alert.alert('कम से कम एक उत्पाद होना चाहिए।'); return; }
    setItemsDraft(p => p.filter(li => li.id !== id));
  };

  const addLine = (stockItem) => {
    setItemsDraft(p => [...p, {
      id: uid(), item: stockItem._id, name: stockItem.name, unit: stockItem.unit || 'KG',
      weightKg: 0, grossWeightKg: 0, deductionPct: 0, deductionAmt: 0, claimPct: 0, claimAmt: 0,
      ratePerKg: stockItem.pricePerUnit || 0, amount: 0,
    }]);
    setPicking(false);
  };

  const liveItemAmount = itemsDraft.reduce((s, li) => s + (Number(li.amount)||0), 0);
  const liveTotal = liveItemAmount - (Number(draft.laborCharge)||0) - (Number(draft.transportCharge)||0) - (Number(draft.claim)||0);

  const handleSync = async () => {
    setSaving(true); setError('');
    try {
      const payload = {
        ...draft,
        items: itemsDraft.map(({ id, ...li }) => li),
        syncedAt: new Date().toISOString(),
      };
      const res = await updateBill(billId, payload);
      setBill(res.bill);
      setDraft({ laborCharge: res.bill.laborCharge||0, transportCharge: res.bill.transportCharge||0, claim: res.bill.claim||0, notes: res.bill.notes||'' });
      setEditing(false);
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

  const openAddPayment = (prefillAmount) => {
    setPayError('');
    setPayForm({ amount: prefillAmount != null ? String(prefillAmount.toFixed(2)) : '', date: today(), mode:'cash', note:'' });
    setAddingPayment(true);
  };

  const submitPayment = async () => {
    setPayError('');
    if (!payForm.amount || Number(payForm.amount) <= 0) { setPayError('राशि डालें।'); return; }
    setPaySaving(true);
    try {
      const res = await addBillPayment(billId, {
        amount: Number(payForm.amount), date: new Date(payForm.date).toISOString(),
        mode: payForm.mode, note: payForm.note,
      });
      setBill(res.bill);
      setAddingPayment(false);
    } catch (e) { setPayError(e.message); } finally { setPaySaving(false); }
  };

  const handleRemovePayment = (paymentId) => {
    Alert.alert('भुगतान हटाएं', 'क्या आप इस भुगतान entry को हटाना चाहते हैं?', [
      { text:'रद्द', style:'cancel' },
      { text:'हटाएं', style:'destructive', onPress: async () => {
        try { const res = await removeBillPayment(billId, paymentId); setBill(res.bill); }
        catch (e) { Alert.alert('Error', e.message); }
      }},
    ]);
  };

  const handlePrint = async () => {
    try { await buildAndShareInvoicePdf(bill); }
    catch (e) { Alert.alert('Error', e.message || 'PDF नहीं बन सका।'); }
  };

  if (!bill) return <View style={{ flex:1, backgroundColor: COLORS.bg }} />;

  const balance = Math.max((bill.totalAmount||0) - (bill.paidAmount||0), 0);
  const tone = bill.status === 'paid' ? 'green' : bill.status === 'partial' ? 'gold' : 'red';
  const paymentsDesc = [...(bill.payments||[])].sort((a,b) => new Date(b.date) - new Date(a.date));

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
              <Text style={[styles.muted, { fontWeight:'700', color: COLORS.blue, marginTop: 2 }]}>{bill.billNumber || '—'}</Text>
            </View>
            <Badge text={bill.status === 'paid' ? '✅ Paid' : bill.status === 'partial' ? '⏳ Partial' : '🔴 Pending'} tone={tone} />
          </View>
        </Card>

        {/* Item Breakdown — editable list when admin is editing */}
        <Card>
          <Text style={styles.section}>📦 वस्तु विवरण</Text>
          {isAdmin && editing ? (
            <>
              {itemsDraft.map(li => (
                <View key={li.id} style={styles.itemLine}>
                  <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'center' }}>
                    <Text style={styles.bold}>{li.name}</Text>
                    {itemsDraft.length > 1 && (
                      <TouchableOpacity onPress={() => removeLine(li.id)}><Text style={{ color: COLORS.red, fontWeight:'700', fontSize: 18 }}>×</Text></TouchableOpacity>
                    )}
                  </View>
                  <Input label="वज़न (KG)" value={String(li.weightKg)} onChangeText={v => updateLine(li.id, { weightKg: Number(v)||0 })} keyboardType="decimal-pad" />
                  <Input label="Rate / KG (₹)" value={String(li.ratePerKg)} onChangeText={v => updateLine(li.id, { ratePerKg: Number(v)||0 })} keyboardType="decimal-pad" />
                  <Input label="क्लेम % (Claim)" value={String(li.claimPct||'')} onChangeText={v => updateLine(li.id, { claimPct: Number(v)||0 })} keyboardType="decimal-pad" />
                  <View style={styles.row}><Text style={styles.muted}>राशि</Text><Text style={styles.val}>{INR(li.amount)}</Text></View>
                </View>
              ))}
              {picking ? (
                <View style={{ marginTop: 8 }}>
                  <Text style={[styles.muted, { marginBottom: 6 }]}>उत्पाद चुनें:</Text>
                  {stockItems.map(s => (
                    <TouchableOpacity key={s._id} style={styles.option} onPress={() => addLine(s)}>
                      <Text style={{ fontWeight:'600', color: COLORS.text }}>{s.name} ({INR(s.pricePerUnit)}/KG)</Text>
                    </TouchableOpacity>
                  ))}
                  <Button title="रद्द करें" variant="outline" onPress={() => setPicking(false)} style={{ marginTop: 6 }} />
                </View>
              ) : (
                <TouchableOpacity style={styles.addBtn} onPress={() => setPicking(true)}>
                  <Text style={{ color: COLORS.blue, fontWeight:'700' }}>+ उत्पाद जोड़ें</Text>
                </TouchableOpacity>
              )}
              <View style={[styles.row, styles.borderTop, { marginTop: 10 }]}><Text style={styles.bold}>कुल वस्तु राशि</Text><Text style={styles.bold}>{INR(liveItemAmount)}</Text></View>
            </>
          ) : (
            (bill.items||[]).map((it, i) => (
              <View key={i} style={i > 0 ? { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: COLORS.border } : null}>
                <Text style={[styles.bold, { marginBottom: 8 }]}>{it.name}</Text>
                {(it.grossWeightKg > 0) && <View style={styles.row}><Text style={styles.muted}>Gross Weight</Text><Text style={styles.val}>{it.grossWeightKg?.toFixed(2)} kg</Text></View>}
                {(it.deductionPct > 0) && <View style={styles.row}><Text style={styles.muted}>Deduction {it.deductionPct}%</Text><Text style={[styles.val, { color: COLORS.red }]}>− {it.deductionAmt?.toFixed(3)} kg</Text></View>}
                <View style={styles.row}><Text style={styles.muted}>Net Weight</Text><Text style={styles.val}>{it.weightKg?.toFixed(3)} kg</Text></View>
                <View style={styles.row}><Text style={styles.muted}>Rate / KG</Text><Text style={styles.val}>{INR(it.ratePerKg)}</Text></View>
                {(it.claimPct > 0) && <View style={styles.row}><Text style={styles.muted}>Claim {it.claimPct}%</Text><Text style={[styles.val, { color: COLORS.red }]}>− {INR(it.claimAmt)}</Text></View>}
                <View style={[styles.row, styles.borderTop]}><Text style={styles.bold}>वस्तु राशि</Text><Text style={styles.bold}>{INR(it.amount)}</Text></View>
              </View>
            ))
          )}
        </Card>

        {/* Deductions — editable by admin */}
        <Card>
          <Text style={styles.section}>➖ कटौतियाँ (Global)</Text>
          {isAdmin && editing ? (
            <>
              {[['laborCharge','लेबर चार्ज'],['transportCharge','ट्रांसपोर्ट'],['claim','क्लेम/डिस्काउंट']].map(([k,l]) => (
                <Input key={k} label={l} value={String(draft[k]||'')} onChangeText={v => setDraft(d=>({...d,[k]:Number(v)||0}))} keyboardType="decimal-pad" />
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
          <View style={styles.row}><Text style={styles.muted}>वस्तु राशि</Text><Text style={styles.val}>{INR(isAdmin && editing ? liveItemAmount : bill.itemAmount)}</Text></View>
          <View style={[styles.row, styles.borderTop]}>
            <Text style={styles.bold}>Grand Total</Text>
            <Text style={[styles.bold, { fontSize: 18, color: COLORS.blue }]}>{INR(isAdmin && editing ? liveTotal : bill.totalAmount)}</Text>
          </View>
          <View style={[styles.row, styles.borderTop]}>
            <Text style={styles.muted}>अब तक प्राप्त भुगतान</Text><Text style={styles.val}>{INR(bill.paidAmount)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.bold}>बकाया राशि</Text>
            <Text style={[styles.bold, { color: balance > 0 ? COLORS.red : COLORS.green }]}>
              {balance > 0 ? INR(balance) : '✅ पूरा भुगतान'}
            </Text>
          </View>
        </Card>

        {/* Payment History / Installments */}
        <Card>
          <Text style={styles.section}>🧾 Payment History</Text>
          {paymentsDesc.length === 0 && <Text style={styles.muted}>अभी कोई भुगतान दर्ज नहीं है।</Text>}
          {paymentsDesc.map(p => (
            <View key={p._id} style={styles.payRow}>
              <View style={{ flex:1 }}>
                <Text style={styles.val}>{INR(p.amount)} <Text style={styles.muted}>· {MODE_LABEL[p.mode]||p.mode}</Text></Text>
                <Text style={styles.muted}>{new Date(p.date).toLocaleDateString('hi-IN')}{p.note ? ` · ${p.note}` : ''}</Text>
              </View>
              {isAdmin && (
                <TouchableOpacity onPress={() => handleRemovePayment(p._id)}><Text style={{ color: COLORS.red, fontWeight:'700', fontSize:16 }}>🗑</Text></TouchableOpacity>
              )}
            </View>
          ))}

          {isAdmin && (addingPayment ? (
            <View style={{ marginTop: 10 }}>
              <Input label="राशि (₹)" value={payForm.amount} onChangeText={v => setPayForm(f=>({...f,amount:v}))} keyboardType="decimal-pad" />
              <Input label="तारीख़ (YYYY-MM-DD)" value={payForm.date} onChangeText={v => setPayForm(f=>({...f,date:v}))} />
              <View style={{ flexDirection:'row', gap: 6, marginBottom: 10 }}>
                {PAYMENT_MODES.map(([k,l]) => (
                  <TouchableOpacity key={k} onPress={() => setPayForm(f=>({...f,mode:k}))} style={[styles.modeChip, payForm.mode===k && styles.optActive]}>
                    <Text style={{ color: payForm.mode===k ? '#fff' : COLORS.text, fontSize: 12, fontWeight:'600' }}>{l}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Input label="नोट / Reference (Optional)" value={payForm.note} onChangeText={v => setPayForm(f=>({...f,note:v}))} />
              {!!payError && <Text style={{ color: COLORS.red, marginBottom: 8 }}>{payError}</Text>}
              <View style={{ flexDirection:'row', gap: 10 }}>
                <Button title="रद्द करें" variant="outline" onPress={() => setAddingPayment(false)} style={{ flex:1 }} />
                <Button title="जोड़ें" onPress={submitPayment} loading={paySaving} style={{ flex:1 }} />
              </View>
            </View>
          ) : (
            <View style={{ flexDirection:'row', gap: 10, marginTop: 10 }}>
              <TouchableOpacity style={styles.addBtn2} onPress={() => openAddPayment()}>
                <Text style={{ color: COLORS.blue, fontWeight:'700' }}>+ भुगतान जोड़ें</Text>
              </TouchableOpacity>
              {balance > 0 && (
                <TouchableOpacity style={[styles.addBtn2, { borderColor: COLORS.green, borderStyle:'solid' }]} onPress={() => openAddPayment(balance)}>
                  <Text style={{ color: COLORS.green, fontWeight:'700' }}>✅ All Paid अभी करें</Text>
                </TouchableOpacity>
              )}
            </View>
          ))}
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
        {isAdmin && !editing && <Button title="✏️ Edit & Sync to Customer" onPress={startEditing} variant="outline" style={{ marginBottom: 10, borderColor: COLORS.gold }} />}
        {isAdmin && editing && (
          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 10 }}>
            <Button title="रद्द करें" variant="outline" onPress={() => setEditing(false)} style={{ flex: 1 }} />
            <Button title="✅ Sync Now" onPress={handleSync} loading={saving} style={{ flex: 1, backgroundColor: COLORS.green }} />
          </View>
        )}
        <Button title="🖨️ Print / PDF" variant="outline" onPress={handlePrint} style={{ marginBottom: 10 }} />
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
  itemLine: { marginBottom: 14, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  addBtn:   { padding: 10, borderWidth: 1, borderColor: COLORS.blue, borderStyle:'dashed', borderRadius: 10, alignItems: 'center', marginTop: 4 },
  addBtn2:  { flex:1, padding: 10, borderWidth: 1, borderColor: COLORS.blue, borderStyle:'dashed', borderRadius: 10, alignItems: 'center' },
  option:   { padding: 10, borderWidth:1, borderColor: COLORS.border, borderRadius: 10, marginBottom: 6 },
  toggle:   { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, borderWidth:1, borderColor: COLORS.border },
  optActive:{ backgroundColor: COLORS.blue, borderColor: COLORS.blue },
  modeChip: { flex:1, paddingVertical: 8, borderRadius: 8, borderWidth:1, borderColor: COLORS.border, alignItems:'center' },
  payRow:   { flexDirection:'row', alignItems:'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: COLORS.border },
});
