import { Image, ImageBackground, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from './theme';

type Props = {
  visible: boolean;
  label: 0 | 1 | null;
  patient: { name: string; pid: string; birth: string };
  stamp: string;
  onClose: () => void;
  onReanalyze: () => void;
};

const RESULT = {
  1: { title: '憂鬱', hint: '建議安排進一步臨床評估', color: colors.danger, icon: require('../assets/images/result-depressed.png') },
  0: { title: '無憂鬱', hint: '未偵測到顯著憂鬱指標', color: colors.success, icon: require('../assets/images/result-healthy.png') },
} as const;

export default function ResultModal({ visible, label, patient, stamp, onClose, onReanalyze }: Props) {
  const r = label === null ? null : RESULT[label];
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={s.backdrop}>
        <View style={s.card}>
          <ImageBackground
            source={require('../assets/images/modal-header-arc.png')}
            resizeMode="stretch"
            style={s.header}
          >
            <Image source={require('../assets/images/icon-result.png')} style={s.headerIcon} />
            <Text style={s.headerTitle}>辨識結果</Text>
          </ImageBackground>

          <View style={s.body}>
            <Image source={require('../assets/images/modal-watermark.png')} style={s.watermark} resizeMode="contain" />
            <Row label="姓名" value={patient.name || '—'} first />
            <Row label="身分證字號" value={patient.pid || '—'} spaced />
            <Row label="出生日期" value={patient.birth || '—'} />

            {r && (
              <View style={s.result}>
                <View style={s.resultIconWrap}>
                  <Image source={r.icon} style={s.resultIcon} />
                </View>
                <View style={{ flexShrink: 1 }}>
                  <Text style={[s.resultTitle, { color: r.color }]}>{r.title}</Text>
                  <Text style={s.resultHint}>{r.hint}</Text>
                </View>
              </View>
            )}

            <View style={s.meta}>
              <Text style={s.metaText}>判讀模型 CMIM v0.1</Text>
              <Text style={s.metaText}>{stamp}</Text>
            </View>

            <View style={s.actions}>
              <Pressable style={[s.btn, s.btnGhost]} onPress={onClose}>
                <Text style={[s.btnText, { color: colors.primary }]}>關閉</Text>
              </Pressable>
              <Pressable style={[s.btn, s.btnSolid]} onPress={onReanalyze}>
                <Text style={[s.btnText, { color: '#fff' }]}>重新分析</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function Row({ label, value, first, spaced }: { label: string; value: string; first?: boolean; spaced?: boolean }) {
  return (
    <View style={[s.row, !first && s.rowDivider]}>
      <Text style={s.rowLabel}>{label}</Text>
      <Text style={[s.rowValue, spaced && { letterSpacing: 1 }]}>{value}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(8,34,32,0.55)', alignItems: 'center', justifyContent: 'center', padding: 20 },
  card: { width: '100%', maxWidth: 340, backgroundColor: '#fff', borderRadius: 20, overflow: 'hidden', elevation: 12 },
  header: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 9,
    paddingTop: 26, paddingHorizontal: 18, paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: '#e6eeed',
  },
  headerIcon: { width: 24, height: 24 },
  headerTitle: { fontSize: 17, fontWeight: '700', color: colors.primary, letterSpacing: 1 },
  body: { padding: 18, overflow: 'hidden' },
  watermark: { position: 'absolute', width: 210, height: 210, right: -46, bottom: -40 },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 10, paddingVertical: 7 },
  rowDivider: { borderTopWidth: 1, borderTopColor: '#edf3f2' },
  rowLabel: { fontSize: 15, fontWeight: '500', color: colors.muted },
  rowValue: { fontSize: 18, fontWeight: '700', color: colors.text },
  result: {
    marginTop: 16, backgroundColor: '#eef7f6', borderWidth: 1, borderColor: '#d9ebe8', borderRadius: 18,
    paddingVertical: 18, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', gap: 18,
  },
  resultIconWrap: {
    width: 84, height: 84, borderRadius: 42, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center',
    shadowColor: '#123c39', shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 2,
  },
  resultIcon: { width: 56, height: 56 },
  resultTitle: { fontSize: 30, fontWeight: '900' },
  resultHint: { fontSize: 14, fontWeight: '500', color: '#4b6b68', marginTop: 4 },
  meta: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 14 },
  metaText: { fontSize: 12.5, color: colors.faint },
  actions: { flexDirection: 'row', gap: 10, marginTop: 14 },
  btn: { flex: 1, height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  btnGhost: { backgroundColor: '#e6f2f0' },
  btnSolid: { backgroundColor: '#1a8f86' },
  btnText: { fontSize: 17, fontWeight: '700' },
});
