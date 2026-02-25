import { authConfig } from '@/constants/AuthConfig';
import { loadSession } from '@/lib/session';

type Subject = {
    id: string;
    name: string;
    code: string | null;
    credits: number | null;
};

export type StudentProfile = {
    id: string;
    email: string;
    name: string | null;
    avatarUrl: string | null;
    career: string | null;
    currentSemester: number | null;
    subjects: Subject[];
};

export type UpdateProfilePayload = {
    career?: string;
    currentSemester?: number;
    subjects?: string[];
};

async function fetchWithAuth(endpoint: string, options: RequestInit = {}) {
    const session = await loadSession();
    if (!session) {
        throw new Error('Not authenticated');
    }

    const headers = new Headers(options.headers);
    headers.set('Authorization', `Bearer ${session.accessToken}`);
    if (!headers.has('Content-Type') && options.method !== 'GET') {
        headers.set('Content-Type', 'application/json');
    }

    const response = await fetch(`${authConfig.backendUrl}${endpoint}`, {
        ...options,
        headers,
    });

    if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        throw new Error(errorBody.message || `Request failed with status ${response.status}`);
    }

    return response.json();
}

export async function getStudentProfile(): Promise<StudentProfile> {
    return fetchWithAuth('/student/profile');
}

export async function updateStudentProfile(data: UpdateProfilePayload): Promise<StudentProfile> {
    return fetchWithAuth('/student/profile', {
        method: 'PUT',
        body: JSON.stringify(data),
    });
}

export async function getAllSubjects(): Promise<Subject[]> {
    return fetchWithAuth('/student/subjects');
}
