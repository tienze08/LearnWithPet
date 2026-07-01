export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  id: number;
  name: string;
  email: string;
}

export interface OnboardingPayload {
  avatarType: string;
  petName: string;
  petSpecies: string;
}