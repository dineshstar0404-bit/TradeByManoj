import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, Image, StyleSheet } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { getUsers } from '../../services/api';
import { getItems } from '../../services/api';
import { createBill } from '../../services/api';
import { Card, Button, Input, ErrorMessage } from '../../components/UI';
import { COLORS } from '../../theme/colors';

const INR = n => '₹' + Number(n||0).toLocaleString('en-IN');
const uid = () => Math.random().toString(36).slice(2,8);
const today = () => new Date().toISOString().slice(0,10);

export default function CreateBillScreen({ navigation, route }) {
  const presetCustomerId = route?.params?.presetCustomerId;
  const [customers,  setCustomers]  = useState([]);
  const [stockItems, setStockItems] = useState([]);
  const [custId,     setCustId]     = useState('');
  const [itemId,     setItemId]     = useState('');
  const [billDate,   setBillDate]   = useState(today());
  const [entries,    setEntries]    = useState([{ id: uid(), value: '' }]);
  const [deductPct,  setDeductPct]  = useState('');
  const [ratePerKg,  setRatePerKg]  = useState('');
  const [laborCharge,setLaborCharge]= useState('');
  const [transport,  setTransport]  = useState('');
  const [claim,      setClaim]      = useState('');
  const [paidAmount, setPaidAmount] = useState('');
  const [allPaid,    setAllPaid]    = useState(false);
  const [photo,      setPhoto]      = useState(null);
  const [driveUrl,   setDriveUrl]   = useState('');
  const [saving,     setSaving]     = useState(false);
  const [error,      setError]      = useState('');

  useEffect(() => {
    getUsers().then(r => {
      const c = r.users||[];
      setCustomers(c);
      const preset = presetCustomerId && c.find(x => x.id === presetCustomerId);
      if (preset) setCustId(preset.id);
      else if (c[0]) setCustId(c[0].id);
    });
    getItems().then(r => { const i = r.items||[]; setStockItems(i); if(i[0]) { setItemId(i[0]._id); setRatePerKg(String(i[0].pricePerUnit)); } });
  }, []);

  useEffect(() => {
    const chosen = stockItems.find(i => i._id === itemId);
    if (chosen) setRatePerKg(String(chosen.pricePerUnit));
  }, [itemId]);

  const grossKg   = entries.reduce((s,e) => s + (Number(e.value)||0), 0);
  const deductAmt = grossKg * ((Number(deductPct)||0) / 100);
  const netKg     = Math.max(grossKg - deductAmt, 0);
  const rKg       = Number(ratePerKg) || 0;
  const itemAmt   = netKg * rKg;
  const L = Number(laborCharge)||0, T = Number(transport)||0, C = Number(claim)||0;
  const total = itemAmt - L - T - C;
  const paid  = allPaid ? total : (Number(paidAmount)||0);

  // Vercel serverless functions hard-cap request bodies at 4.5MB (not configurable),
  // so an oversized photo fails the upload with no useful error — catch it client-side.
  const MAX_PHOTO_BYTES = 4 * 1024 * 1024;
  const acceptPhoto = (asset) => {
    if (asset.fileSize && asset.fileSize > MAX_PHOTO_BYTES) {
      Alert.alert('फोटो बहुत बड़ी है', 'कृपया कम रिज़ॉल्यूशन/क्वालिटी में दोबारा फोटो लें (4MB से कम)।');
      return;
    }
    setPhoto(asset);
  };

  const pickPhoto = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) { Alert.alert('Permission','Camera permission required.'); return; }
    const res = await ImagePicker.launchCameraAsync({ quality: 0.4 });
    if (!res.canceled) acceptPhoto(res.assets[0]);
  };

  const pickGallery = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({ quality: 0.4 });
    if (!res.canceled) acceptPhoto(res.assets[0]);
  };

  const submit = async () => {
    if (!custId)   { setError('ग्राहक चुनें।'); return; }
    if (netKg <= 0){ setError('वज़न डालें।');   return; }
    if (rKg <= 0)  { setError('Rate डालें।');   return; }

    const chosenItem = stockItems.find(i => i._id === itemId);
    const payload = {
      customer:        custId,
      billDate:        new Date(billDate).toISOString(),
      items:           JSON.stringify([{ item: itemId, name: chosenItem?.name||'', unit: 'KG', weightKg: netKg, grossWeightKg: grossKg, deductionPct: Number(deductPct)||0, deductionAmt: deductAmt, ratePerKg: rKg, amount: itemAmt }]),
      itemAmount:      itemAmt,
      laborCharge:     L, transportCharge: T, claim: C,
      paidAmount:      paid,
      notes:           '',
      driveImageUrl:   driveUrl.trim(),
    };

    setSaving(true); setError('');
    try {
      await createBill(payload, photo);
      Alert.alert('✅ सफल', 'बिल सफलतापूर्वक बन गया!', [{ text: 'ठीक है', onPress: () => navigation.goBack() }]);
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={{ padding: 16 }}>
        {/* Customer */}
        <Card>
          <Text style={styles.label}>ग्राहक चुनें</Text>
          {customers.map(c => (
            <TouchableOpacity key={c.id} onPress={() => setCustId(c.id)} style={[styles.option, custId===c.id && styles.optActive]}>
              <Text style={{ color: custId===c.id ? '#fff' : COLORS.text, fontWeight:'600' }}>{c.name}</Text>
            </TouchableOpacity>
          ))}
        </Card>

        {/* Date */}
        <Card>
          <Input label={`📅 बिल तारीख़ (Default: आज — ${new Date(billDate).toLocaleDateString('hi-IN')})`} value={billDate} onChangeText={setBillDate} placeholder="YYYY-MM-DD" />
          {billDate !== today() && <TouchableOpacity onPress={() => setBillDate(today())}><Text style={{ color: COLORS.blue, fontSize: 12 }}>↺ आज की तारीख़</Text></TouchableOpacity>}
        </Card>

        {/* Item */}
        <Card>
          <Text style={styles.label}>वस्तु चुनें</Text>
          {stockItems.map(i => (
            <TouchableOpacity key={i._id} onPress={() => setItemId(i._id)} style={[styles.option, itemId===i._id && styles.optActive]}>
              <Text style={{ color: itemId===i._id ? '#fff' : COLORS.text, fontWeight:'600' }}>{i.name} ({INR(i.pricePerUnit)}/KG)</Text>
            </TouchableOpacity>
          ))}
        </Card>

        {/* Weight entries */}
        <Card>
          <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom: 12 }}>
            <Text style={styles.label}>वज़न (KG)</Text>
            <TouchableOpacity onPress={() => setEntries(p => [...p, { id: uid(), value:'' }])} style={styles.addBtn}>
              <Text style={{ color: COLORS.blue, fontWeight:'700' }}>+ बैग जोड़ें</Text>
            </TouchableOpacity>
          </View>
          {entries.map((e, i) => (
            <View key={e.id} style={{ flexDirection:'row', alignItems:'center', gap: 8, marginBottom: 8 }}>
              <Text style={styles.muted}>{i+1}.</Text>
              <Input value={e.value} onChangeText={v => setEntries(p => p.map(x => x.id===e.id ? {...x,value:v} : x))} keyboardType="decimal-pad" placeholder="0.00 kg" style={{ flex:1, marginBottom:0 }} />
              {entries.length > 1 && <TouchableOpacity onPress={() => setEntries(p => p.filter(x => x.id!==e.id))}><Text style={{ color: COLORS.red, fontWeight:'700', fontSize: 18 }}>×</Text></TouchableOpacity>}
            </View>
          ))}
          <View style={styles.totalBox}><Text style={styles.muted}>Gross: {entries.map(e=>Number(e.value)||0).join(' + ')} = </Text><Text style={styles.boldText}>{grossKg.toFixed(2)} kg</Text></View>

          <Input label={`कटौती % (Deduction)`} value={deductPct} onChangeText={setDeductPct} keyboardType="decimal-pad" placeholder="जैसे: 0.5" />
          {Number(deductPct) > 0 && <View style={styles.netBox}><Text style={{ color: COLORS.amber }}>Net Weight: {netKg.toFixed(3)} kg</Text></View>}
          <Input label="Rate per KG (₹)" value={ratePerKg} onChangeText={setRatePerKg} keyboardType="decimal-pad" placeholder="22.00" />
          <View style={styles.totalBox}><Text style={styles.muted}>वस्तु राशि</Text><Text style={styles.boldText}>{INR(itemAmt)}</Text></View>
        </Card>

        {/* Additional charges */}
        <Card>
          <Text style={styles.label}>कटौतियाँ (सभी घटाई जाएंगी)</Text>
          <Input label="लेबर चार्ज (−)" value={laborCharge} onChangeText={setLaborCharge} keyboardType="decimal-pad" placeholder="0" />
          <Input label="ट्रांसपोर्ट चार्ज (−)" value={transport} onChangeText={setTransport} keyboardType="decimal-pad" placeholder="0" />
          <Input label="क्लेम / डिस्काउंट (−)" value={claim} onChangeText={setClaim} keyboardType="decimal-pad" placeholder="0" />
        </Card>

        {/* Live total */}
        <Card style={{ backgroundColor:'#EFF6FF', borderColor:'#BFDBFE' }}>
          <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'center' }}>
            <Text style={{ fontWeight:'700', color: COLORS.dark }}>कुल बिल राशि</Text>
            <Text style={{ fontSize: 20, fontWeight:'800', color: COLORS.blue }}>{INR(total)}</Text>
          </View>
          <Text style={{ fontSize: 11, color: COLORS.muted, marginTop: 4 }}>({netKg.toFixed(3)}kg × {INR(rKg)}) − {INR(L)} − {INR(T)} − {INR(C)}</Text>
        </Card>

        {/* Payment */}
        <Card>
          <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom: 8 }}>
            <Text style={styles.label}>भुगतान राशि</Text>
            <TouchableOpacity onPress={() => setAllPaid(s => !s)} style={[styles.toggle, allPaid && { backgroundColor: COLORS.blue }]}>
              <Text style={{ color: allPaid ? '#fff' : COLORS.muted, fontSize: 12, fontWeight:'600' }}>All Paid</Text>
            </TouchableOpacity>
          </View>
          <Input value={allPaid ? String(total.toFixed(2)) : paidAmount} onChangeText={v => { setPaidAmount(v); setAllPaid(false); }} keyboardType="decimal-pad" placeholder="0" editable={!allPaid} />
          <View style={{ flexDirection:'row', justifyContent:'space-between' }}>
            <Text style={styles.muted}>बकाया राशि</Text>
            <Text style={{ fontWeight:'700', color: (total - paid) > 0 ? COLORS.red : COLORS.green }}>{(total - paid) > 0 ? INR(total - paid) : '✅ पूरा भुगतान'}</Text>
          </View>
        </Card>

        {/* Photo */}
        <Card>
          <Text style={styles.label}>बिल फोटो (Optional)</Text>
          <View style={{ flexDirection:'row', gap: 10, marginBottom: 12 }}>
            <TouchableOpacity style={styles.photoBtn} onPress={pickPhoto}><Text style={{ color: COLORS.blue, fontWeight:'600' }}>📷 कैमरे से</Text></TouchableOpacity>
            <TouchableOpacity style={styles.photoBtn} onPress={pickGallery}><Text style={{ color: COLORS.blue, fontWeight:'600' }}>🖼️ गैलरी से</Text></TouchableOpacity>
          </View>
          {photo && <Image source={{ uri: photo.uri }} style={{ width:'100%', height: 160, borderRadius: 10 }} />}
          <Input label="या Google Drive लिंक" value={driveUrl} onChangeText={setDriveUrl} placeholder="https://drive.google.com/..." />
        </Card>

        <ErrorMessage message={error} />
        <Button title="बिल जनरेट करें" onPress={submit} loading={saving} />
        <View style={{ height: 30 }} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex:1, backgroundColor: COLORS.bg },
  label:     { fontWeight:'700', color: COLORS.text, marginBottom: 8 },
  muted:     { color: COLORS.muted, fontSize: 12 },
  boldText:  { fontWeight:'700', color: COLORS.text },
  option:    { padding: 10, borderWidth:1, borderColor: COLORS.border, borderRadius: 10, marginBottom: 6 },
  optActive: { backgroundColor: COLORS.blue, borderColor: COLORS.blue },
  addBtn:    { padding: 6, paddingHorizontal: 12, borderWidth:1, borderColor: COLORS.blue, borderRadius: 20 },
  totalBox:  { flexDirection:'row', justifyContent:'space-between', backgroundColor:'#F9FAFB', padding: 10, borderRadius: 10, marginTop: 8, marginBottom: 4 },
  netBox:    { backgroundColor:'#FFFBEB', padding: 10, borderRadius: 10, marginBottom: 8 },
  toggle:    { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, borderWidth:1, borderColor: COLORS.border },
  photoBtn:  { flex:1, padding: 12, borderWidth:1, borderColor: COLORS.blue, borderRadius: 10, alignItems:'center' },
});
