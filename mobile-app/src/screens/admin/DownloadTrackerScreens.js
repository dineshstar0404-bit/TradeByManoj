import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, Switch, Alert, ScrollView, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Card, Button, Input, Badge, ErrorMessage } from '../../components/UI';
import { COLORS } from '../../theme/colors';

const uid = () => Math.random().toString(36).slice(2,10);
const STORE_KEY = 'mt_downloaders_v1';

const SEED = [
  { id:'d1', name:'Rajesh Sharma',  phone:'9876501234', email:'rajesh@gmail.com',      city:'Lucknow, UP',    device:'Android 13 · Samsung', version:'v1.0.0', downloadedAt: new Date(Date.now()-86400000).toISOString(),  status:'active'   },
  { id:'d2', name:'Priya Verma',    phone:'9812345670', email:'priya@yahoo.com',        city:'Kanpur, UP',     device:'iOS 17 · iPhone 13',   version:'v1.0.0', downloadedAt: new Date(Date.now()-3*86400000).toISOString(),status:'active'   },
  { id:'d3', name:'Amit Singh',     phone:'9900112233', email:'amit@outlook.com',       city:'Varanasi, UP',   device:'Android 12 · Redmi',   version:'v1.0.0', downloadedAt: new Date(Date.now()-7*86400000).toISOString(),status:'inactive' },
  { id:'d4', name:'Sunita Yadav',   phone:'9988001122', email:'sunita.y@gmail.com',     city:'Ayodhya, UP',    device:'Android 11 · Vivo Y21',version:'v1.0.0', downloadedAt: new Date(Date.now()-2*86400000).toISOString(),status:'active'   },
  { id:'d5', name:'Mohan Lal',      phone:'9700334455', email:'',                       city:'Gorakhpur, UP',  device:'Android 10 · Realme',  version:'v1.0.0', downloadedAt: new Date(Date.now()-10*86400000).toISOString(),status:'inactive' },
];

// ── PIN Gate ────────────────────────────────────────────────────
export function DownloadTrackerGateScreen({ navigation }) {
  const [pin, setPin] = useState('');
  const [err, setErr] = useState('');
  const [tries, setTries] = useState(0);

  const unlock = () => {
    if (pin === '1234') { navigation.replace('DownloadTrackerList'); }
    else {
      const t = tries + 1; setTries(t); setPin('');
      setErr(t >= 3 ? 'बहुत अधिक गलत प्रयास — बाद में कोशिश करें।' : `गलत पिन — दोबारा कोशिश करें। (${t}/3)`);
    }
  };

  return (
    <View style={{ flex:1, backgroundColor: COLORS.bg, alignItems:'center', justifyContent:'center', padding: 28 }}>
      <View style={{ width:64, height:64, borderRadius:32, backgroundColor:'#EFF6FF', alignItems:'center', justifyContent:'center', marginBottom:16 }}>
        <Text style={{ fontSize: 28 }}>📥</Text>
      </View>
      <Text style={{ fontWeight:'800', fontSize:16, color: COLORS.text, marginBottom: 4 }}>सॉफ्टवेयर डाउनलोडर ट्रैकिंग</Text>
      <Text style={{ color: COLORS.muted, fontSize: 12, marginBottom: 24 }}>Admin PIN डालें · Demo: 1234</Text>
      <View style={{ width:'100%' }}>
        <Input value={pin} onChangeText={v=>{setPin(v);setErr('');}} keyboardType="number-pad" maxLength={6} secureTextEntry placeholder="• • • •" />
        <ErrorMessage message={err} />
        <Button title="अनलॉक करें →" onPress={unlock} disabled={tries >= 3} />
      </View>
    </View>
  );
}

// ── Downloader List ──────────────────────────────────────────────
export function DownloadTrackerListScreen({ navigation }) {
  const [data,     setData]     = useState([]);
  const [query,    setQuery]    = useState('');
  const [filter,   setFilter]   = useState('all'); // 'all' | 'active' | 'inactive'
  const [showAdd,  setShowAdd]  = useState(false);
  const [form,     setForm]     = useState({ name:'', phone:'', email:'', city:'', device:'', version:'v1.0.0', status:'active' });
  const [saving,   setSaving]   = useState(false);
  const [addErr,   setAddErr]   = useState('');
  const [flash,    setFlash]    = useState(false);
  const u = k => v => setForm(s => ({ ...s, [k]: v }));

  // Load from AsyncStorage (with seed fallback)
  const load = useCallback(async () => {
    const stored = await AsyncStorage.getItem(STORE_KEY);
    setData(stored ? JSON.parse(stored) : SEED);
  }, []);

  const save = async (next) => { await AsyncStorage.setItem(STORE_KEY, JSON.stringify(next)); setData(next); };

  useCallback(() => { load(); }, []);
  React.useEffect(() => { load(); }, []);

  const toggleStatus = async (id) => {
    const next = data.map(d => d.id === id ? { ...d, status: d.status === 'active' ? 'inactive' : 'active' } : d);
    await save(next);
  };

  const handleDelete = (id, name) => {
    Alert.alert('हटाएं', `${name} की entry हटाएं?`, [
      { text:'रद्द', style:'cancel' },
      { text:'हटाएं', style:'destructive', onPress: async () => save(data.filter(d => d.id !== id)) },
    ]);
  };

  const handleAdd = async () => {
    if (!form.name.trim() || !form.phone.trim() || !form.city.trim()) { setAddErr('नाम, फोन और शहर ज़रूरी हैं।'); return; }
    setSaving(true); setAddErr('');
    const entry = { ...form, id: uid(), downloadedAt: new Date().toISOString() };
    const next  = [entry, ...data];
    await save(next);
    setForm({ name:'', phone:'', email:'', city:'', device:'', version:'v1.0.0', status:'active' });
    setShowAdd(false); setSaving(false);
    setFlash(true); setTimeout(() => setFlash(false), 2500);
  };

  const filtered = data.filter(d => {
    const q = query.toLowerCase();
    const matchQ = !q || d.name?.toLowerCase().includes(q) || d.phone?.includes(q) || d.city?.toLowerCase().includes(q) || d.device?.toLowerCase().includes(q);
    const matchF = filter === 'all' || d.status === filter;
    return matchQ && matchF;
  });

  const active   = data.filter(d => d.status === 'active').length;
  const inactive = data.filter(d => d.status === 'inactive').length;

  return (
    <View style={{ flex:1, backgroundColor: COLORS.bg }}>
      {/* Summary */}
      <View style={styles.summary}>
        {[{l:'कुल',v:data.length},{l:'Active',v:active,t:'green'},{l:'Inactive',v:inactive,t:'red'}].map(s=>(
          <View key={s.l} style={styles.sumCard}><Text style={styles.sumLabel}>{s.l}</Text><Text style={[styles.sumVal,{color:s.t?COLORS[s.t]:COLORS.text}]}>{s.v}</Text></View>
        ))}
      </View>

      {flash && <View style={{ backgroundColor:'#DCFCE7', padding: 10, alignItems:'center' }}><Text style={{ color: COLORS.green, fontWeight:'700' }}>✅ डाउनलोडर जोड़ा गया!</Text></View>}

      <View style={{ padding: 12, gap: 8 }}>
        <Input value={query} onChangeText={setQuery} placeholder="🔍 नाम, फोन, शहर, device खोजें..." />
        <View style={{ flexDirection:'row', gap: 8 }}>
          {['all','active','inactive'].map(f=>(
            <TouchableOpacity key={f} onPress={()=>setFilter(f)} style={[styles.filterBtn, filter===f && styles.filterActive]}>
              <Text style={{ color: filter===f?'#fff':COLORS.muted, fontWeight:'600', fontSize:12 }}>{f==='all'?'सभी':f==='active'?'Active':'Inactive'}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={d => d.id}
        contentContainerStyle={{ padding: 12, paddingTop: 0 }}
        ListFooterComponent={<View style={{ height:80 }} />}
        ListEmptyComponent={<Text style={{ color:COLORS.muted, textAlign:'center', marginTop:20 }}>कोई डाउनलोडर नहीं मिला।</Text>}
        renderItem={({ item: d }) => (
          <Card>
            <View style={{ flexDirection:'row', alignItems:'flex-start', justifyContent:'space-between', marginBottom: 8 }}>
              <View style={{ flexDirection:'row', alignItems:'center', flex:1 }}>
                <View style={{ width:36, height:36, borderRadius:18, backgroundColor: COLORS.blue, alignItems:'center', justifyContent:'center', marginRight:8 }}>
                  <Text style={{ color:'#fff', fontWeight:'800' }}>{d.name?.charAt(0)}</Text>
                </View>
                <View style={{ flex:1 }}>
                  <Text style={styles.boldText}>{d.name}</Text>
                  <Text style={styles.muted}>📞 {d.phone}{d.email?`  ·  📧 ${d.email}`:''}</Text>
                </View>
              </View>
              <Badge text={d.status==='active'?'Active':'Inactive'} tone={d.status==='active'?'green':'red'} />
            </View>
            <Text style={styles.muted}>📍 {d.city}</Text>
            <Text style={styles.muted}>📱 {d.device||'—'} · {d.version}</Text>
            <Text style={styles.muted}>🕐 {new Date(d.downloadedAt).toLocaleDateString('hi-IN',{year:'numeric',month:'long',day:'numeric'})}</Text>
            <View style={{ flexDirection:'row', alignItems:'center', marginTop: 10, gap: 10 }}>
              <View style={{ flexDirection:'row', alignItems:'center', flex:1, gap: 6 }}>
                <Text style={{ fontSize:12, color:COLORS.muted }}>Status बदलें</Text>
                <Switch value={d.status==='active'} onValueChange={() => toggleStatus(d.id)} trackColor={{ true: COLORS.green }} />
              </View>
              <TouchableOpacity onPress={() => handleDelete(d.id, d.name)} style={styles.delBtn}>
                <Text style={{ color: COLORS.red, fontSize:12, fontWeight:'600' }}>🗑️ हटाएं</Text>
              </TouchableOpacity>
            </View>
          </Card>
        )}
      />

      {/* Add button */}
      <TouchableOpacity style={styles.fab} onPress={() => setShowAdd(true)}>
        <Text style={{ color:'#fff', fontSize:24, fontWeight:'300' }}>+</Text>
      </TouchableOpacity>

      {/* Add Modal */}
      {showAdd && (
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>नया डाउनलोडर जोड़ें</Text>
            <ScrollView>
              <Input label="नाम *" value={form.name} onChangeText={u('name')} />
              <Input label="फोन *" value={form.phone} onChangeText={u('phone')} keyboardType="phone-pad" />
              <Input label="ईमेल" value={form.email} onChangeText={u('email')} keyboardType="email-address" autoCapitalize="none" />
              <Input label="शहर / पता *" value={form.city} onChangeText={u('city')} />
              <Input label="डिवाइस" value={form.device} onChangeText={u('device')} placeholder="Android 12 · Redmi Note" />
              <Input label="वर्शन" value={form.version} onChangeText={u('version')} />
              <ErrorMessage message={addErr} />
              <View style={{ flexDirection:'row', gap: 10 }}>
                <Button title="रद्द करें" variant="outline" onPress={() => { setShowAdd(false); setAddErr(''); }} style={{ flex:1 }} />
                <Button title="जोड़ें ✓" onPress={handleAdd} loading={saving} style={{ flex:1 }} />
              </View>
            </ScrollView>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  summary:     { flexDirection:'row', padding: 12, gap: 8, backgroundColor: COLORS.white, borderBottomWidth:1, borderColor: COLORS.border },
  sumCard:     { flex:1, alignItems:'center', padding: 10, backgroundColor: COLORS.bg, borderRadius: 10 },
  sumLabel:    { fontSize:10, color: COLORS.muted, fontWeight:'600' },
  sumVal:      { fontSize:16, fontWeight:'800', marginTop: 2 },
  filterBtn:   { flex:1, paddingVertical: 8, alignItems:'center', borderRadius:20, borderWidth:1, borderColor: COLORS.border },
  filterActive:{ backgroundColor: COLORS.blue, borderColor: COLORS.blue },
  boldText:    { fontWeight:'700', color: COLORS.text, fontSize:14 },
  muted:       { color: COLORS.muted, fontSize:12, marginTop: 2 },
  delBtn:      { paddingHorizontal:12, paddingVertical: 6, borderWidth:1, borderColor:'#FECACA', borderRadius:8 },
  fab:         { position:'absolute', right:20, bottom:20, width:56, height:56, borderRadius:28, backgroundColor: COLORS.blue, alignItems:'center', justifyContent:'center', elevation:6, shadowColor:'#000', shadowOpacity:0.2, shadowRadius:8 },
  modalOverlay:{ position:'absolute', inset:0, backgroundColor:'rgba(0,0,0,0.5)', justifyContent:'flex-end' },
  modal:       { backgroundColor: COLORS.white, borderTopLeftRadius:20, borderTopRightRadius:20, padding:20, maxHeight:'80%' },
  modalTitle:  { fontSize:16, fontWeight:'800', color: COLORS.text, marginBottom:16 },
});
