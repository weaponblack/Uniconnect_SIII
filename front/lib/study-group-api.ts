import { authConfig } from '@/constants/AuthConfig';
import { loadSession } from '@/lib/session';

export type StudyGroupMember = {
    id: string;
    name: string | null;
    email: string;
    career?: string | null;
    currentSemester?: number | null;
};

export type StudyGroupOwner = {
    id: string;
    name: string | null;
    email: string;
};

export type StudyGroup = {
    id: string;
    name: string;
    description: string | null;
    ownerId: string;
    owner: StudyGroupOwner;
    members: StudyGroupMember[];
    createdAt: string;
    updatedAt: string;
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
        let errorBody = {};
        try {
            errorBody = await response.json();
        } catch { }
        // @ts-ignore
        throw new Error(errorBody.message || `Request failed with status ${response.status}`);
    }

    if (response.status === 204) {
        return;
    }

    return response.json();
}

export async function getStudentStudyGroups(studentId: string): Promise<StudyGroup[]> {
    return fetchWithAuth(`/groups/student/${studentId}`);
}

export async function createStudyGroup(data: { name: string; description?: string }): Promise<StudyGroup> {
    return fetchWithAuth('/groups', {
        method: 'POST',
        body: JSON.stringify(data),
    });
}

export async function updateStudyGroup(groupId: string, data: { name?: string; description?: string }): Promise<StudyGroup> {
    return fetchWithAuth(`/groups/${groupId}`, {
        method: 'PUT',
        body: JSON.stringify(data),
    });
}

export async function addMembersToStudyGroup(groupId: string, memberIds: string[]): Promise<StudyGroup> {
    return fetchWithAuth(`/groups/${groupId}/members`, {
        method: 'POST',
        body: JSON.stringify({ memberIds }),
    });
}

export async function searchStudentsByName(query: string): Promise<StudyGroupMember[]> {
    return fetchWithAuth(`/student/search?name=${encodeURIComponent(query)}`);
}

export async function deleteStudyGroup(groupId: string): Promise<void> {
    return fetchWithAuth(`/groups/${groupId}`, {
        method: 'DELETE',
    });
}

export async function removeMemberFromStudyGroup(groupId: string, memberId: string): Promise<StudyGroup> {
    return fetchWithAuth(`/groups/${groupId}/members/${memberId}`, {
        method: 'DELETE',
    });
}
