
export enum Language {
  ENGLISH = 'en',
  KRIO = 'krio'
}

export enum Sender {
  USER = 'user',
  AI = 'ai'
}

export interface Message {
  id: string;
  sender: Sender;
  text: string;
  timestamp: Date;
  groundingSources?: any[];
}

export interface NavMenuOption {
  id: string;
  label: string;
  krioLabel: string;
  icon: string;
}

export interface HealthCondition {
  name: string;
  description: string;
  symptoms: string[];
  treatment: string;
  prevention: string;
  emergencySigns: string[];
}

export interface HealthAnalysis {
  conditions: HealthCondition[];
  generalAdvice: string;
}

export interface CarePlan {
  lifestyle: string[];
  homeMonitoring: string[];
  whenToSeeDoctor: string;
  healthTip: string;
}

export interface Clinic {
  id: string;
  name: string;
  location: string;
  district: string;
  phone: string;
  type: string;
  is24Hour: boolean;
  isAddictionSupport: boolean;
  lat: number;
  lng: number;
  description?: string;
}

export interface SavedCase {
  id: string;
  topic: string;
  conditions: HealthCondition[];
  generalAdvice: string;
  patientDetails?: {
    timeline: string;
    severeSymptoms: string[];
    isPregnant?: boolean;
  };
  clinicalTriage: 'RED' | 'YELLOW' | 'GREEN';
  labDiagnosticTests: string[];
  researchGuidelineSummary: string;
  suggestedDoctorQuestions: string[];
  carePlan?: CarePlan;
  timestamp: string;
}

