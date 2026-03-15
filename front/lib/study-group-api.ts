import apiClient from './api-client';

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

export async function getStudentStudyGroups(studentId: string): Promise<StudyGroup[]> {
    const response = await apiClient.get<StudyGroup[]>(`/groups/student/${studentId}`);
    return response.data;
}

export async function createStudyGroup(data: { name: string; description?: string }): Promise<StudyGroup> {
    const response = await apiClient.post<StudyGroup>('/groups', data);
    return response.data;
}

export async function updateStudyGroup(groupId: string, data: { name?: string; description?: string }): Promise<StudyGroup> {
    const response = await apiClient.put<StudyGroup>(`/groups/${groupId}`, data);
    return response.data;
}

export async function addMembersToStudyGroup(groupId: string, memberIds: string[]): Promise<StudyGroup> {
    const response = await apiClient.post<StudyGroup>(`/groups/${groupId}/members`, { memberIds });
    return response.data;
}

export async function searchStudentsByName(query: string): Promise<StudyGroupMember[]> {
    const response = await apiClient.get<StudyGroupMember[]>(`/student/search?name=${encodeURIComponent(query)}`);
    return response.data;
}

export async function deleteStudyGroup(groupId: string): Promise<void> {
    await apiClient.delete(`/groups/${groupId}`);
}

export async function removeMemberFromStudyGroup(groupId: string, memberId: string): Promise<StudyGroup> {
    const response = await apiClient.delete<StudyGroup>(`/groups/${groupId}/members/${memberId}`);
    return response.data;
}
