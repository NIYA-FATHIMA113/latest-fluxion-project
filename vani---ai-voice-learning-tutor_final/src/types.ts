export interface Student {
  id: number;
  name: string;
  phone_number: string;
  grade_level: number;
  language_preference: string;
  created_at: string;
  updated_at: string;
}

export interface SessionMessage {
  id: number;
  role: 'tutor' | 'student' | 'system';
  message_type: 'speech' | 'text' | 'dtmf';
  content: string;
  turn_number: number;
  model_used?: string;
  timestamp: string;
}

export interface SessionSummary {
  id?: number;
  session_id?: string;
  concept_learned: string;
  strengths: string;
  areas_for_improvement: string;
  recommended_next_step: string;
  estimated_mastery_percentage: number;
  evaluator_model?: string;
  generated_at?: string;
}

export interface AIModel {
  id: string;
  name: string;
  provider: string;
  endpoint?: string;
  is_configured: boolean;
  recommended_for: string;
  description: string;
}

export interface LearningSession {
  id: number;
  session_id: string;
  student: Student;
  subject: string;
  topic: string;
  status: 'active' | 'completed' | 'abandoned';
  total_turns: number;
  started_at: string;
  ended_at: string | null;
  summary?: SessionSummary | null;
}

export interface WebhookLog {
  id: string;
  timestamp: string;
  endpoint: string;
  method: string;
  requestParams: Record<string, string>;
  twiml: string;
  status: number;
}

export interface TopicOption {
  id: string;
  title: string;
  grade: string;
  description: string;
  initialQuestion: string;
  starterUtterances: string[];
}
