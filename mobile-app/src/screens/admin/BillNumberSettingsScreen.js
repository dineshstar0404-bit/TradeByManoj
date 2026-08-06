import React, { useEffect, useState } from 'react';
import { View, Text, Alert, StyleSheet } from 'react-native';
import { getBillNumberSettings, updateBillNumberSettings } from '../../services/api';
import { Card, Button, Input, ErrorMessage } from '../../components/UI';
import { COLORS } from '../../theme/colors';

export default function BillNumberSettingsScreen() {
  const [prefix,   setPrefix]   = useState('');
  const [padding,  setPadding]  = useState('');
  const [resetTo,  setResetTo]  = useState('');
  const [preview,  setPreview]  = useState('');
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const r = await getBillNumberSettings();
      setPrefix(r.prefix); setPadding(String(r.padding)); setPreview(r.nextPreview);
    } catch (e) { setError(e.message); } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    setError('');
    if (!prefix.trim()) { setError('Prefix ज़रूरी है।'); return; }
    setSaving(true);
    try {
      const payload = { prefix: prefix.trim(), padding: Number(padding)||4 };
      if (resetTo.trim()) payload.resetTo = Number(resetTo);
      const r = await updateBillNumberSettings(payload);
      setPreview(r.nextPreview); setResetTo('');
      Alert.alert('✅ सेव हुआ', `अगला बिल नंबर: ${r.nextPreview}`);
    } catch (e) { setError(e.message); } finally { setSaving(false); }
  };

  if (loading) return <View style={{ flex:1, backgroundColor: COLORS.bg }} />;

  return (
    <View style={{ flex:1, backgroundColor: COLORS.bg, padding: 16 }}>
      <Card style={{ backgroundColor:'#EFF6FF', borderColor:'#BFDBFE' }}>
        <Text style={styles.muted}>अगला बिल नंबर</Text>
        <Text style={styles.preview}>{preview}</Text>
      </Card>

      <Card>
        <Input label="Bill Prefix (जैसे: INV, BILL)" value={prefix} onChangeText={setPrefix} autoCapitalize="characters" placeholder="INV" />
        <Input label="अंकों की संख्या (Padding)" value={padding} onChangeText={setPadding} keyboardType="number-pad" placeholder="4" />
        <Input label="शुरुआती नंबर बदलें (Optional)" value={resetTo} onChangeText={setResetTo} keyboardType="number-pad" placeholder="जैसे: 1 (अगला बिल इसी नंबर से शुरू होगा)" />
        <Text style={[styles.muted, { fontSize: 11 }]}>⚠️ यह सिर्फ आगे बनने वाले बिलों पर लागू होगा, पुराने बिल नंबर नहीं बदलेंगे।</Text>
      </Card>

      <ErrorMessage message={error} />
      <Button title="सेव करें" onPress={save} loading={saving} />
    </View>
  );
}

const styles = StyleSheet.create({
  muted:   { color: COLORS.muted, fontSize: 12 },
  preview: { fontSize: 22, fontWeight:'800', color: COLORS.blue, marginTop: 4 },
});
