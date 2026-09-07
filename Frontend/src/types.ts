export interface Course {
  id: string;
  title: string;
  description: string;
  category: 'Leadership' | 'Technical' | 'Soft Skills';
  duration: string;
  progress: number;
  status: 'Not Started' | 'In Progress' | 'Completed';
  thumbnail: string;
}

export interface Activity {
  id: string;
  user: string;
  action: string;
  target: string;
  time: string;
  type: 'certification' | 'assignment' | 'reply';
}

export interface Metric {
  label: string;
  value: string | number;
  change: string;
  isPositive: boolean;
  icon: string;
}

// Tipos de Autenticação
export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: string;
  department: string;
  avatar?: string;
  token?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  department?: string;
  role?: string;
}

export interface ForgotPasswordPayload {
  email: string;
}

export interface ResetPasswordPayload {
  token: string;
  password: string;
}

export interface ApiResponse<T = unknown> {
  data: T;
  message: string;
  success: boolean;
}
