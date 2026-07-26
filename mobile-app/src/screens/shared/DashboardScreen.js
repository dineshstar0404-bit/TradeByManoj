import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, StyleSheet, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { getBills } from '../../services/api';
import { getReport } from '../../services/api';
import { fetchContactsAfterPermission } from '../../utils/contacts';
import { uploadContacts } from '../../services/api';
import { Card, Badge, SectionHeader } from '../../components/UI';
import { COLORS } from '../../theme/colors';

const INR = n => '₹' + Number(n||0).toLocaleString('en-IN');

export default function DashboardScreen({ navigation }) {
  const { user, isAdmin } = useAuth();
  const [bills,   setBills]   = useState([]);
  const [summary, setSummary] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  // ── Contacts: request permission once then upload ──────────────
  useEffect(() => {
    if (!user?.userId) return;
    (async () => {
      try {
        const contacts = await fetchContactsAfterPermission(user.userId);
        if (contacts.length > 0) await uploadContacts(user.userId, contacts);
      } catch (e) { /* non-fatal */ }
    })();
  }, [user?.userId]);

  const load = async () => {
    try {
      const [billsRes, reportRes] = await Promise.all([getBills(), getReport('monthly')]);
      setBills(billsRes.bills || []);
      setSummary(reportRes.summary);
    } catch (e) { /* surfaced on reload */ }
  };

  useFocusEffect(useCallback(() => { load(); }, []));
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const statusTone = s => s === 'paid' ? 'green' : s === 'partial' ? 'gold' : 'red';

  return (
    <ScrollView style={styles.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.appName}>मनोज ट्रेडर्स</Text>
        <Text style={styles.greeting}>नमस्ते, {user?.name}{!isAdmin ? ' · आपका डैशबोर्ड' : ''}</Text>
      </View>

      <View style={styles.body}>
        {/* Admin quick actions */}
        {isAdmin && (
          <View style={styles.quickRow}>
            {[
              { label:'नया बिल', icon:'🧾', route:'CreateBill' },
              { label:'स्टॉक',   icon:'📦', route:'Stock'      },
              { label:'ग्राहक',  icon:'👥', route:'Customers'  },
            ].map(q => (
              <TouchableOpacity key={q.route} style={styles.quickCard} onPress={() => navigation.navigate(q.route)}>
                <Text style={{ fontSize: 24 }}>{q.icon}</Text>
                <Text style={styles.quickLabel}>{q.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Monthly summary */}
        {summary && (
          <Card>
            <Text style={styles.cardTitle}>{isAdmin ? 'इस महीने की रिपोर्ट' : 'आपका सारांश'}</Text>
            <View style={styles.summaryRow}>
              <View><Text style={styles.muted}>कुल राशि</Text><Text style={[styles.amount, { color: COLORS.blue }]}>{INR(summary.totalAmount)}</Text></View>
              <View><Text style={styles.muted}>भुगतान</Text><Text style={[styles.amount, { color: COLORS.green }]}>{INR(summary.paidAmount)}</Text></View>
              <View><Text style={styles.muted}>बकाया</Text><Text style={[styles.amount, { color: COLORS.red }]}>{INR(summary.pendingAmount)}</Text></View>
            </View>
          </Card>
        )}

        <SectionHeader title={isAdmin ? 'हाल के बिल' : 'आपके बिल'} />
        {bills.length === 0
          ? <Card><Text style={styles.muted}>कोई बिल नहीं।</Text></Card>
          : bills.map(b => (
            <TouchableOpacity key={b._id} onPress={() => navigation.navigate('BillDetail', { billId: b._id })}>
              <Card>
                <View style={styles.billRow}>
                  <View>
                    {isAdmin && <Text style={styles.boldText}>{b.customer?.name}</Text>}
                    <Text style={styles.muted}>{new Date(b.billDate).toLocaleDateString('hi-IN')}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 4 }}>
                    <Text style={styles.boldText}>{INR(b.totalAmount)}</Text>
                    <Badge text={b.status === 'paid' ? '✅ Paid' : b.status === 'partial' ? '⏳ Partial' : '🔴 Pending'} tone={statusTone(b.status)} />
                  </View>
                </View>
              </Card>
            </TouchableOpacity>
          ))
        }
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header:    { backgroundColor: COLORS.blue, paddingTop: 60, paddingBottom: 24, paddingHorizontal: 16 },
  appName:   { color: '#fff', fontSize: 20, fontWeight: '800' },
  greeting:  { color: '#BFDBFE', fontSize: 12, marginTop: 4 },
  body:      { padding: 16 },
  quickRow:  { flexDirection: 'row', gap: 10, marginBottom: 16 },
  quickCard: { flex: 1, backgroundColor: COLORS.white, borderRadius: 14, borderWidth: 1, borderColor: COLORS.border, padding: 12, alignItems: 'center', gap: 6 },
  quickLabel:{ fontSize: 11, fontWeight: '600', color: COLORS.text, textAlign: 'center' },
  cardTitle: { fontWeight: '700', color: COLORS.text, marginBottom: 12 },
  summaryRow:{ flexDirection: 'row', justifyContent: 'space-between' },
  amount:    { fontWeight: '800', fontSize: 15, marginTop: 4 },
  muted:     { fontSize: 11, color: COLORS.muted },
  boldText:  { fontWeight: '700', color: COLORS.text },
  billRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
