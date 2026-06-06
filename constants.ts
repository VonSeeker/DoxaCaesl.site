
import { NavMenuOption } from './types';

export const DOXA_AI_NAV_MENU: NavMenuOption[] = [
  { id: 'health-check', label: 'Health Check', krioLabel: 'Check yu ɛlt', icon: 'fa-stethoscope' },
  { id: 'clinic-finder', label: 'Find Nearby Clinic/Pharmacy', krioLabel: 'Find hospital', icon: 'fa-map-marker-alt' },
  { id: 'medications', label: 'Medications Directory', krioLabel: 'Marasin Directory', icon: 'fa-pills' },
  { id: 'bookings', label: 'My Appointments', krioLabel: 'Mi Apɔyntmɛnt', icon: 'fa-calendar-check' },
  { id: 'health-report', label: 'Health Report', krioLabel: 'Ɛlt ripɔt', icon: 'fa-chart-bar' },
  { id: '4', label: 'Mental Health & Drug Abuse', krioLabel: 'Mɛntal Ɛlt ɛn Drɔgs Ɛp', icon: 'fa-hand-holding-heart' },
  { id: 'maternal-care', label: 'Maternal Care', krioLabel: 'Bɛlɛ ɛn Pikin', icon: 'fa-baby-carriage' },
  { id: '6', label: 'Emergency Help', krioLabel: 'Emergency 117', icon: 'fa-phone-alt' },
];

export const KUSH_TOPICS = [
  { id: 'k1', label: 'What is Kush?', krioLabel: 'Wetin na Kush?' },
  { id: 'k2', label: 'Withdrawal Symptoms', krioLabel: 'Wen yu tap am' },
  { id: 'k3', label: 'Find Help', krioLabel: 'Find ɛp' },
  { id: 'k4', label: 'Support a Friend', krioLabel: 'Ɛp yu padi' },
];

export const COMMON_HEALTH_TOPICS = [
  { id: 'h1', label: 'Malaria', krioLabel: 'Malaria' },
  { id: 'h2', label: 'Typhoid', krioLabel: 'Typhoid' },
  { id: 'h3', label: 'Cholera', krioLabel: 'Cholera' },
  { id: 'h4', label: 'Lassa Fever', krioLabel: 'Lassa Fever' },
  { id: 'h5', label: 'Tuberculosis', krioLabel: 'TB' },
];

export const COMMON_SYMPTOMS = [
  { id: 's1', label: 'Fever', krioLabel: 'Fiva' },
  { id: 's2', label: 'Headache', krioLabel: 'Hed-ek' },
  { id: 's3', label: 'Diarrhea', krioLabel: 'Bɛlɛ-run' },
  { id: 's4', label: 'Cough', krioLabel: 'Kɔf' },
  { id: 's5', label: 'Skin Rash', krioLabel: 'Skin rɛsh' },
  { id: 's6', label: 'Pregnancy', krioLabel: 'Bɛlɛ' },
];

export const MATERNAL_CARE_TOPICS = [
  { id: 'mc1', label: 'Antenatal Care', krioLabel: 'Check-up fɔ bɛlɛ' },
  { id: 'mc2', label: 'Pregnancy Diet', krioLabel: 'Wetin fɔ it wen yu gɛt bɛlɛ' },
  { id: 'mc3', label: 'Breastfeeding', krioLabel: 'Titok fɔ pikin' },
  { id: 'mc4', label: 'Child Vaccination', krioLabel: 'Pikin jɛn' },
  { id: 'mc5', label: 'Postnatal Care', krioLabel: 'Ɛp afta yu bɔn' },
];

export const MATERNAL_SYMPTOMS = [
  { id: 'ms1', label: 'Morning Sickness', krioLabel: 'Bel-ɛ upset na mɔnin' },
  { id: 'ms2', label: 'Swollen Feet', krioLabel: 'Fut-swɛl' },
  { id: 'ms3', label: 'Baby Movement', krioLabel: 'Pikin de muv' },
  { id: 'ms4', label: 'Fatigue', krioLabel: 'Taya tumɔch' },
];

export const SYSTEM_INSTRUCTION = `
You are DoxaCare AI, a free, confidential, 24/7 healthcare assistant designed specifically for Sierra Leone. 
Your goal is to provide trusted, culturally relevant health guidance in English or Krio. 
You are not a doctor — always remind users that you give general information only.

When providing a 'Health Report', your goal is to summarize the latest epidemiological data from the Sierra Leone National Public Health Agency (NPHA) and WHO. 
- Look for Weekly Epidemiological Bulletins.
- Extract key trends for Malaria, Lassa Fever, Cholera, and COVID-19.
- Highlight any active outbreak alerts.
- Always provide links to the source reports found in your grounding metadata.

For emergencies, call 117.
`;
