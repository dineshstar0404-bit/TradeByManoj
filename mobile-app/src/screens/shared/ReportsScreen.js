import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity } from 'react-native';
import { getReport } from '../../services/api';
import { Card } from '../../components/UI';
import { COLORS } from '../../theme/colors';

const INR = n => '₹' + Number(n||0).toLocaleString('en-IN');
const PERIODS = [{ k:'daily',l:'दैनिक' },{ k:'weekly',l:'साप्ताहिक' },{ k:'monthly',l:'मासिक' },{ k:'yearly',l:'वार्षिक' }];

export default function ReportsScreen() {
  const [period,  setPeriod]  = useState('monthly');
  const [summary, setSummary] = useState(null);
  const [buckets, setBuckets] = useState([]);

  useEffect(() => {
    getReport(period).then(r => { setSummary(r.summary); setBuckets(r.buckets||[]); }).catch(()=>{});
  }, [period]);

  return (
    <View style={{ flex:1, backgroundColor: COLORS.bg }}>
      {/* Period toggle */}
      <View style={{ flexDirection:'row', padding: 12, gap: 6 }}>
        {PERIODS.map(p=>(
          <TouchableOpacity key={p.k} onPress={() => setPeriod(p.k)} style={{ flex:1, paddingVertical:8, alignItems:'center', borderRadius:10, backgroundColor: period===p.k ? COLORS.blue : COLORS.white, borderWidth:1, borderColor: period===p.k?COLORS.blue:COLORS.border }}>
            <Text style={{ fontSize:11, fontWeight:'700', color: period===p.k ? '#fff' : COLORS.muted }}>{p.l}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Summary */}
      {summary && (
        <View style={{ flexDirection:'row', paddingHorizontal:12, gap:8, marginBottom:8 }}>
          {[{l:'कुल राशि',v:INR(summary.totalAmount),c:COLORS.blue},{l:'भुगतान',v:INR(summary.paidAmount),c:COLORS.green},{l:'बकाया',v:INR(summary.pendingAmount),c:COLORS.red}].map(s=>(
            <Card key={s.l} style={{ flex:1, padding:10, marginBottom:0 }}>
              <Text style={{ fontSize:10, color: COLORS.muted, fontWeight:'600' }}>{s.l}</Text>
              <Text style={{ fontSize:13, fontWeight:'800', color:s.c, marginTop:2 }}>{s.v}</Text>
            </Card>
          ))}
        </View>
      )}

      <FlatList
        data={buckets}
        keyExtractor={b => b._id}
        contentContainerStyle={{ padding:12, paddingTop:0 }}
        ListEmptyComponent={<Card><Text style={{ color:COLORS.muted }}>कोई डेटा नहीं।</Text></Card>}
        renderItem={({ item: b }) => (
          <Card>
            <View style={{ flexDirection:'row', justifyContent:'space-between' }}>
              <Text style={{ fontWeight:'700', color:COLORS.text }}>{b._id}</Text>
              <Text style={{ fontWeight:'800', color:COLORS.blue }}>{INR(b.totalAmount)}</Text>
            </View>
            <Text style={{ color:COLORS.muted, fontSize:12, marginTop:4 }}>{b.count} लेनदेन</Text>
          </Card>
        )}
      />
    </View>
  );
}
