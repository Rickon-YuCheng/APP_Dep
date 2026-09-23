import { useEffect, useState } from 'react';
import { Alert, Image, ImageBackground, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker, { DateTimePickerAndroid, DateTimePickerChangeEvent } from '@react-native-community/datetimepicker';
import * as DocumentPicker from 'expo-document-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { analyze, PickedFile } from './analyze';
import ResultModal from './ResultModal';
import { colors } from './theme';

const STORAGE_KEY = 'tcvgh_dep_doctor';
const DEPT = '精神部';
const PID_RE = /^[A-Za-z][0-9]{9}$/;
const AUDIO_EXT = ['wav', 'mp3', 'm4a'];
const TEXT_EXT = ['txt', 'csv', 'docx'];
const AUDIO_MAX_BYTES = 200 * 1024 * 1024;

const ext = (name: string) => name.split('.').pop()?.toLowerCase() ?? '';
const pad = (n: number) => String(n).padStart(2, '0');
const fmtDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const fmtStamp = (d: Date) => `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;

export default function DoctorScreen() {
  const insets = useSafeAreaInsets();
  const [doctor, setDoctor] = useState('');
  const [remember, setRemember] = useState(true);
  const [pname, setPname] = useState('');
  const [pid, setPid] = useState('');
  const [birth, setBirth] = useState('');
  const [showIosPicker, setShowIosPicker] = useState(false);
  const [audio, setAudio] = useState<PickedFile | null>(null);
  const [text, setText] = useState<PickedFile | null>(null);
  const [status, setStatus] = useState<'idle' | 'running' | 'done'>('idle');
  const [result, setResult] = useState<0 | 1 | null>(null);
  const [stamp, setStamp] = useState('');

  // 記住此裝置的醫師資訊
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((v) => {
        const saved = v ? JSON.parse(v) : null;
        if (saved?.doctor) setDoctor(saved.doctor);
      })
      .catch(() => {});
  }, []);

  const persist = (name: string, keep: boolean) => {
    if (keep) AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ doctor: name, dept: DEPT })).catch(() => {});
    else AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
  };

  const onDoctorChange = (v: string) => {
    setDoctor(v);
    persist(v, remember);
  };

  const toggleRemember = () => {
    const v = !remember;
    setRemember(v);
    persist(doctor, v);
  };

  const birthDate = birth ? new Date(`${birth}T00:00:00`) : new Date(1980, 0, 1);
  const onDatePicked = (_e: DateTimePickerChangeEvent, d: Date) => {
    if (Platform.OS === 'ios') setShowIosPicker(false);
    setBirth(fmtDate(d));
  };
  const pickBirth = () => {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({ value: birthDate, mode: 'date', maximumDate: new Date(), onValueChange: onDatePicked });
    } else {
      setShowIosPicker((v) => !v);
    }
  };

  const pickFile = async (kind: 'audio' | 'text') => {
    const res = await DocumentPicker.getDocumentAsync({
      type: kind === 'audio' ? 'audio/*' : '*/*',
      copyToCacheDirectory: true,
    });
    if (res.canceled) return;
    const a = res.assets[0];
    const allowed = kind === 'audio' ? AUDIO_EXT : TEXT_EXT;
    if (!allowed.includes(ext(a.name))) {
      Alert.alert('檔案格式不支援', `請選擇 ${allowed.map((x) => x.toUpperCase()).join(' / ')} 檔案`);
      return;
    }
    if (kind === 'audio' && a.size !== undefined && a.size > AUDIO_MAX_BYTES) {
      Alert.alert('檔案過大', '語音檔上限為 200 MB');
      return;
    }
    const f = { uri: a.uri, name: a.name, size: a.size, mimeType: a.mimeType };
    if (kind === 'audio') setAudio(f);
    else setText(f);
  };

  const pidError = pid.length > 0 && !PID_RE.test(pid);
  const ready = !!(pname.trim() && PID_RE.test(pid) && birth && audio && doctor.trim());
  const running = status === 'running';

  const runAnalyze = async () => {
    if (!ready || !audio || running) return;
    setStatus('running');
    setResult(null);
    const label = await analyze({
      audio,
      transcript: text,
      patient: { name: pname, pid, birth },
      doctor: { name: doctor, dept: DEPT },
    });
    setResult(label);
    setStamp(fmtStamp(new Date()));
    setStatus('done');
  };

  const audioLabel = audio
    ? `${audio.name}${audio.size !== undefined ? ` · ${(audio.size / 1048576).toFixed(1)} MB` : ''}`
    : 'WAV / MP3 / M4A，上限 200 MB';
  const textLabel = text
    ? `${text.name}${text.size !== undefined ? ` · ${(text.size / 1024).toFixed(0)} KB` : ''}`
    : 'TXT / CSV / DOCX 逐字稿';

  return (
    <View style={s.screen}>
      <ScrollView keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets contentContainerStyle={{ paddingBottom: insets.bottom }}>
        {/* 院徽列 */}
        <View style={[s.topbar, { paddingTop: insets.top + 12 }]}>
          <LinearGradient colors={['#1aa79d', '#7fcdc6']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[s.topArc, { height: insets.top + 24 }]} />
          <View style={s.brandRow}>
            <Image source={require('../assets/images/hospital-logo.png')} style={s.logo} resizeMode="contain" />
            <View style={s.brandBar} />
            <Text style={s.motto} numberOfLines={1}>愛心 · 品質 · 創新 · 當責</Text>
          </View>
        </View>

        {/* 標題區 */}
        <ImageBackground source={require('../assets/images/hero-bg.png')} resizeMode="cover" style={s.hero}>
          <LinearGradient
            colors={['rgba(255,255,255,0.92)', 'rgba(255,255,255,0.92)', 'rgba(255,255,255,0.55)']}
            locations={[0, 0.45, 1]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
          <View style={s.pill}><Text style={s.pillText}>精神部 · 醫師端</Text></View>
          <Text style={s.heroTitle}>憂鬱程度自動評估</Text>
          <Text style={s.heroSub}>多模態（語音＋文字）AI 輔助判讀</Text>
        </ImageBackground>

        <View style={s.content}>
          {/* 醫師資訊 */}
          <View style={s.card}>
            <Text style={s.cardTitle}>醫師資訊</Text>
            <Text style={s.label}>醫師姓名</Text>
            <TextInput value={doctor} onChangeText={onDoctorChange} placeholder="例：王小名" placeholderTextColor={colors.placeholder} style={s.input} />
            <Pressable onPress={toggleRemember} style={s.checkRow} hitSlop={6}>
              <View style={[s.checkbox, remember && s.checkboxOn]}>{remember && <View style={s.checkmark} />}</View>
              <Text style={s.checkText}>記住此裝置的醫師資訊</Text>
            </Pressable>
          </View>

          {/* 病患基本資料 */}
          <View style={s.card}>
            <Text style={s.cardTitle}>病患基本資料</Text>
            <Text style={s.label}>姓名</Text>
            <TextInput value={pname} onChangeText={setPname} placeholder="請輸入病患姓名" placeholderTextColor={colors.placeholder} style={s.input} />
            <Text style={[s.label, s.labelGap]}>身分證字號</Text>
            <TextInput
              value={pid}
              onChangeText={(v) => setPid(v.toUpperCase())}
              placeholder="A123456789"
              placeholderTextColor={colors.placeholder}
              maxLength={10}
              autoCapitalize="characters"
              autoCorrect={false}
              style={[s.input, { letterSpacing: 2 }]}
            />
            {pidError && <Text style={s.error}>身分證字號格式有誤（1 英文字母 + 9 數字）</Text>}
            <Text style={[s.label, s.labelGap]}>出生日期</Text>
            <Pressable onPress={pickBirth} style={[s.input, s.dateField]}>
              <Text style={{ fontSize: 18, color: birth ? colors.text : colors.placeholder }}>{birth || 'YYYY-MM-DD'}</Text>
            </Pressable>
            {showIosPicker && (
              <DateTimePicker value={birthDate} mode="date" display="inline" maximumDate={new Date()} onValueChange={onDatePicked} locale="zh-TW" />
            )}
          </View>

          {/* 上傳診間資料 */}
          <View style={s.card}>
            <Text style={[s.cardTitle, { marginBottom: 4 }]}>上傳診間資料</Text>
            <Text style={s.cardHint}>語音與逐字稿皆上傳可啟用多模態判讀</Text>
            <UploadRow
              icon={require('../assets/images/icon-audio.png')}
              iconStyle={{ width: 30, height: 30 }}
              iconBg={colors.primary}
              title="語音檔（必填）"
              sub={audioLabel}
              onPress={() => pickFile('audio')}
            />
            <View style={{ height: 10 }} />
            <UploadRow
              icon={require('../assets/images/icon-transcript.png')}
              iconStyle={{ width: 24, height: 24 }}
              iconBg="#3aa9a1"
              title="逐字稿（選填）"
              sub={textLabel}
              onPress={() => pickFile('text')}
            />
          </View>

          <Pressable
            onPress={runAnalyze}
            disabled={!ready || running}
            style={[s.submit, { backgroundColor: ready && !running ? colors.primary : colors.disabled }]}
          >
            <Text style={s.submitText}>{running ? '分析中…' : '開始分析'}</Text>
          </Pressable>

          <View style={s.photo}>
            <Image source={require('../assets/images/campus-photo.jpg')} style={StyleSheet.absoluteFill} resizeMode="cover" />
            <LinearGradient colors={['rgba(0,0,0,0)', 'rgba(6,40,38,0.72)']} style={s.photoCaption}>
              <Text style={s.photoCaptionText}>臺中榮民總醫院 · 精神部</Text>
            </LinearGradient>
          </View>

          <Text style={s.disclaimer}>本系統輸出為 AI 輔助判讀結果，僅供臨床參考，不取代醫師診斷。</Text>
        </View>
      </ScrollView>

      <ResultModal
        visible={status === 'done'}
        label={result}
        patient={{ name: pname, pid, birth }}
        stamp={stamp}
        onClose={() => setStatus('idle')}
        onReanalyze={runAnalyze}
      />
    </View>
  );
}

function UploadRow(props: { icon: number; iconStyle: object; iconBg: string; title: string; sub: string; onPress: () => void }) {
  return (
    <Pressable onPress={props.onPress} style={s.upload}>
      <View style={[s.uploadIcon, { backgroundColor: props.iconBg }]}>
        <Image source={props.icon} style={props.iconStyle} resizeMode="contain" />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={s.uploadTitle}>{props.title}</Text>
        <Text style={s.uploadSub} numberOfLines={1}>{props.sub}</Text>
      </View>
      <Text style={s.uploadAction}>選擇</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  topbar: { backgroundColor: '#fff', paddingHorizontal: 18, paddingBottom: 12, overflow: 'hidden' },
  topArc: { position: 'absolute', top: 0, right: 0, width: 132, borderBottomLeftRadius: 110 },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  logo: { height: 36, width: 136 },
  brandBar: { width: 3, height: 26, backgroundColor: colors.accent, borderRadius: 2 },
  motto: { fontSize: 12, fontWeight: '500', color: colors.primary, letterSpacing: 1.5, flexShrink: 1 },
  hero: { padding: 18, borderTopWidth: 3, borderTopColor: colors.accent, backgroundColor: '#e8eef2' },
  pill: { alignSelf: 'flex-start', backgroundColor: colors.primary, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 99, marginBottom: 10 },
  pillText: { fontSize: 12, fontWeight: '700', color: '#fff' },
  heroTitle: { fontSize: 25, lineHeight: 31, fontWeight: '900', color: colors.text },
  heroSub: { fontSize: 14, fontWeight: '500', color: '#4b6360', marginTop: 4 },
  content: { padding: 16, paddingBottom: 28, gap: 14 },
  card: { backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: colors.border, padding: 16 },
  cardTitle: { fontSize: 17, fontWeight: '700', color: colors.text, marginBottom: 12 },
  cardHint: { fontSize: 13, color: '#7a8d8b', marginBottom: 12 },
  label: { fontSize: 14, fontWeight: '500', color: colors.label, marginBottom: 6 },
  labelGap: { marginTop: 12 },
  input: {
    height: 50, borderWidth: 1.5, borderColor: colors.inputBorder, borderRadius: 10,
    paddingHorizontal: 14, fontSize: 18, color: colors.text, backgroundColor: colors.inputBg,
  },
  dateField: { justifyContent: 'center' },
  error: { fontSize: 13, fontWeight: '500', color: colors.error, marginTop: 6 },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 14 },
  checkbox: { width: 24, height: 24, borderRadius: 7, borderWidth: 2, borderColor: '#c3d2d0', alignItems: 'center', justifyContent: 'center' },
  checkboxOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  checkmark: {
    width: 11, height: 6, borderLeftWidth: 2.5, borderBottomWidth: 2.5, borderColor: '#fff',
    transform: [{ rotate: '-45deg' }, { translateY: -1 }],
  },
  checkText: { fontSize: 14, fontWeight: '500', color: '#425654' },
  upload: {
    flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1.5, borderStyle: 'dashed',
    borderColor: '#9ccfca', backgroundColor: '#f3fbfa', borderRadius: 12, padding: 14,
  },
  uploadIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  uploadTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  uploadSub: { fontSize: 13, color: colors.muted },
  uploadAction: { fontSize: 14, fontWeight: '700', color: colors.primary },
  submit: { height: 60, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  submitText: { fontSize: 20, fontWeight: '700', color: '#fff', letterSpacing: 1 },
  photo: { height: 104, borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: colors.border },
  photoCaption: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingVertical: 8, paddingHorizontal: 12 },
  photoCaptionText: { fontSize: 12.5, fontWeight: '500', color: '#fff' },
  disclaimer: { fontSize: 12, lineHeight: 20, color: colors.faint, textAlign: 'center', paddingHorizontal: 8, paddingBottom: 20 },
});
