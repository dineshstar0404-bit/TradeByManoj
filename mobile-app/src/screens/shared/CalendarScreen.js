// CalendarScreen.js
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, FlatList, StyleSheet } from 'react-native';
import { getTransactions } from '../../services/api';
import { Card, Badge } from '../../components/UI';
import { COLORS } from '../../theme/colors';

const INR = n => '₹' + Number(n||0).toLocaleString('en-IN');

export function CalendarScreen() {
  const [cursor, setCursor] = useState(new Date());
  const [sel,    setSel]    = useState(new Date().toISOString().slice(0,10));
  const [txns,   setTxns]   = useState([]);

  useEffect(() => {
    getTransactions({ month: cursor.getMonth()+1, year: cursor.getFullYear() }).then(r => setTxns(r.transactions||[])).catch(()=>{});
  }, [cursor.getMonth(), cursor.getFullYear()]);

  const yr = cursor.getFullYear(), mo = cursor.getMonth();
  const firstDay = new Date(yr, mo, 1).getDay();
  const daysInMo = new Date(yr, mo+1, 0).getDate();
  const cells    = [...Array(firstDay).fill(null), ...Array.from({length:daysInMo},(_,i)=>i+1)];
  const markedSet = new Set(txns.map(t => new Date(t.date).toISOString().slice(0,10)));
  const selTxns  = txns.filter(t => new Date(t.date).toISOString().slice(0,10) === sel);

  return (
    <View style={{ flex:1, backgroundColor: COLORS.bg }}>
      <View style={{ padding: 16 }}>
        {/* Month nav */}
        <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom: 12 }}>
          <TouchableOpacity onPress={() => setCursor(new Date(yr, mo-1, 1))} style={styles.navBtn}><Text style={{ color: COLORS.blue, fontWeight:'700' }}>‹</Text></TouchableOpacity>
          <Text style={{ fontWeight:'700', color: COLORS.text }}>{cursor.toLocaleString('en',{month:'long'})} {yr}</Text>
          <TouchableOpacity onPress={() => setCursor(new Date(yr, mo+1, 1))} style={styles.navBtn}><Text style={{ color: COLORS.blue, fontWeight:'700' }}>›</Text></TouchableOpacity>
        </View>
        {/* Day headers */}
        <View style={styles.dayRow}>{['Su','Mo','Tu','We','Th','Fr','Sa'].map(d=><Text key={d} style={styles.dayLabel}>{d}</Text>)}</View>
        {/* Calendar grid */}
        <View style={styles.grid}>
          {cells.map((day, i) => {
            if (!day) return <View key={i} style={styles.cell} />;
            const ds  = `${yr}-${String(mo+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
            const mk  = markedSet.has(ds);
            const isl = ds === sel;
            return (
              <TouchableOpacity key={i} style={[styles.cell, isl && { backgroundColor: COLORS.blue, borderRadius: 20 }]} onPress={() => setSel(ds)}>
                <Text style={[styles.dayNum, isl && { color: '#fff' }]}>{day}</Text>
                {mk && !isl && <View style={styles.dot} />}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
      {/* Transactions for selected day */}
      <FlatList
        data={selTxns}
        keyExtractor={t => t._id}
        contentContainerStyle={{ padding: 16, paddingTop: 0 }}
        ListEmptyComponent={<Card><Text style={{ color: COLORS.muted }}>इस तारीख़ के लिए कोई लेनदेन नहीं।</Text></Card>}
        renderItem={({ item: t }) => (
          <Card>
            <View style={{ flexDirection:'row', justifyContent:'space-between' }}>
              <View><Text style={{ fontWeight:'700', color: COLORS.text }}>{t.itemName}</Text><Text style={{ color: COLORS.muted, fontSize:12 }}>{t.customer?.name}</Text></View>
              <View style={{ alignItems:'flex-end' }}>
                <Text style={{ fontWeight:'700', color: COLORS.blue }}>{INR(t.amount)}</Text>
                <Badge text={t.status==='paid'?'Paid':'Pending'} tone={t.status==='paid'?'green':'red'} />
              </View>
            </View>
          </Card>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  navBtn:   { padding: 8, borderWidth:1, borderColor: COLORS.border, borderRadius: 8, width: 36, alignItems:'center' },
  dayRow:   { flexDirection:'row', marginBottom: 8 },
  dayLabel: { flex:1, textAlign:'center', fontSize:11, color: COLORS.muted, fontWeight:'600' },
  grid:     { flexDirection:'row', flexWrap:'wrap' },
  cell:     { width:'14.28%', aspectRatio:1, alignItems:'center', justifyContent:'center' },
  dayNum:   { fontSize:13, color: COLORS.text, fontWeight:'500' },
  dot:      { width:4, height:4, borderRadius:2, backgroundColor: COLORS.gold, position:'absolute', bottom:2 },
});
