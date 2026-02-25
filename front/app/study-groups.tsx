import { useEffect, useState, useCallback } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View, Modal, FlatList } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { loadSession, type SessionData } from '@/lib/session';
import {
    getStudentStudyGroups,
    createStudyGroup,
    updateStudyGroup,
    addMembersToStudyGroup,
    searchStudentsByName,
    type StudyGroup,
    type StudyGroupMember
} from '@/lib/study-group-api';

export default function StudyGroupsScreen() {
    const [session, setSession] = useState<SessionData | null>(null);
    const [groups, setGroups] = useState<StudyGroup[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const [isCreateModalVisible, setCreateModalVisible] = useState(false);
    const [newGroupName, setNewGroupName] = useState('');
    const [newGroupDesc, setNewGroupDesc] = useState('');
    const [isCreating, setIsCreating] = useState(false);

    // Edit state
    const [editingGroup, setEditingGroup] = useState<StudyGroup | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<StudyGroupMember[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [isAddingMember, setIsAddingMember] = useState(false);

    useFocusEffect(
        useCallback(() => {
            async function fetchGroups() {
                try {
                    const currentSession = await loadSession();
                    if (!currentSession) {
                        router.replace('/');
                        return;
                    }
                    setSession(currentSession);
                    const data = await getStudentStudyGroups(currentSession.user.id);
                    setGroups(data);
                } catch (error) {
                    console.error('Failed to load groups', error);
                } finally {
                    setIsLoading(false);
                }
            }
            fetchGroups();
        }, [])
    );

    const handleCreateGroup = async () => {
        if (!newGroupName.trim()) return;
        try {
            setIsCreating(true);
            const created = await createStudyGroup({
                name: newGroupName.trim(),
                description: newGroupDesc.trim() || undefined,
            });
            setGroups([created, ...groups]);
            setCreateModalVisible(false);
            setNewGroupName('');
            setNewGroupDesc('');
        } catch (error) {
            console.error('Error creating group', error);
            alert('Error al crear el grupo');
        } finally {
            setIsCreating(false);
        }
    };

    const handleSearch = async () => {
        if (!searchQuery.trim()) {
            setSearchResults([]);
            return;
        }
        try {
            setIsSearching(true);
            const results = await searchStudentsByName(searchQuery.trim());
            // Filter out existing members (very basic filter)
            if (editingGroup) {
                const memberIds = new Set(editingGroup.members.map(m => m.id));
                setSearchResults(results.filter(r => !memberIds.has(r.id)));
            } else {
                setSearchResults(results);
            }
        } catch (error) {
            console.error('Search error', error);
            alert('Error al buscar estudiantes');
        } finally {
            setIsSearching(false);
        }
    };

    const handleAddMember = async (memberId: string) => {
        if (!editingGroup) return;
        try {
            setIsAddingMember(true);
            const updatedGroup = await addMembersToStudyGroup(editingGroup.id, [memberId]);
            setEditingGroup(updatedGroup);
            setGroups(groups.map(g => (g.id === updatedGroup.id ? updatedGroup : g)));
            setSearchResults(searchResults.filter(r => r.id !== memberId));
            alert('Estudiante añadido');
        } catch (error) {
            console.error('Add member error', error);
            alert('Error al añadir miembro');
        } finally {
            setIsAddingMember(false);
        }
    };

    if (isLoading || !session) {
        return (
            <View style={styles.loaderContainer}>
                <ActivityIndicator />
                <Text style={styles.loaderText}>Cargando grupos...</Text>
            </View>
        );
    }

    if (editingGroup) {
        // Edit mode UI
        return (
            <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
                <Pressable onPress={() => { setEditingGroup(null); setSearchQuery(''); setSearchResults([]); }} style={styles.backButton}>
                    <Text style={styles.backButtonText}>← Volver a mis grupos</Text>
                </Pressable>

                <Text style={styles.title}>Gestionar: {editingGroup.name}</Text>
                <Text style={styles.subtitle}>{editingGroup.description || 'Sin descripción'}</Text>

                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Miembros actuales ({editingGroup.members.length})</Text>
                    {editingGroup.members.map((member) => (
                        <View key={member.id} style={styles.memberItem}>
                            <Text style={styles.memberName}>{member.name || member.email}</Text>
                            <Text style={styles.memberCareer}>{member.career || 'Sin carrera'} • Semestre {member.currentSemester || '?'}</Text>
                            {member.id === editingGroup.ownerId ? (
                                <View style={styles.ownerBadge}><Text style={styles.ownerBadgeText}>Propietario</Text></View>
                            ) : null}
                        </View>
                    ))}
                </View>

                {session.user.id === editingGroup.ownerId && (
                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>Añadir estudiantes</Text>
                        <View style={styles.searchRow}>
                            <TextInput
                                style={[styles.input, styles.flexInput]}
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                                placeholder="Buscar por nombre..."
                                placeholderTextColor="#94a3b8"
                                onSubmitEditing={handleSearch}
                            />
                            <Pressable style={styles.searchButton} onPress={handleSearch} disabled={isSearching}>
                                <Text style={styles.searchButtonText}>{isSearching ? '...' : 'Buscar'}</Text>
                            </Pressable>
                        </View>

                        {searchResults.length > 0 && (
                            <View style={styles.searchResults}>
                                {searchResults.map((student) => (
                                    <View key={student.id} style={styles.resultItem}>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.resultName}>{student.name || student.email}</Text>
                                            <Text style={styles.resultCareer}>{student.career || 'Sin carrera'} • Semestre {student.currentSemester || '?'}</Text>
                                        </View>
                                        <Pressable
                                            style={styles.addButton}
                                            onPress={() => handleAddMember(student.id)}
                                            disabled={isAddingMember}
                                        >
                                            <Text style={styles.addButtonText}>Añadir</Text>
                                        </Pressable>
                                    </View>
                                ))}
                            </View>
                        )}
                        {searchResults.length === 0 && searchQuery.trim() !== '' && !isSearching && (
                            <Text style={styles.noResultsText}>No se encontraron resultados nuevos.</Text>
                        )}
                    </View>
                )}
            </ScrollView>
        );
    }

    // List mode UI
    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Pressable onPress={() => router.back()} style={styles.backButtonOnly}>
                    <Text style={styles.backButtonText}>← Atrás</Text>
                </Pressable>
                <Text style={styles.title}>Grupos de Estudio</Text>
                <Text style={styles.subtitle}>Tus grupos actuales</Text>
            </View>

            <ScrollView contentContainerStyle={styles.listContainer}>
                {groups.length === 0 ? (
                    <Text style={styles.emptyText}>No perteneces a ningún grupo de estudio todavía. ¡Crea uno!</Text>
                ) : (
                    groups.map((group) => {
                        const isOwner = group.ownerId === session.user.id;
                        return (
                            <View key={group.id} style={styles.groupCard}>
                                <View style={styles.groupHeader}>
                                    <Text style={styles.groupName}>{group.name}</Text>
                                    {isOwner && (
                                        <View style={styles.ownerBadge}>
                                            <Text style={styles.ownerBadgeText}>Propietario</Text>
                                        </View>
                                    )}
                                </View>
                                <Text style={styles.groupDesc}>{group.description || 'Sin descripción'}</Text>
                                <Text style={styles.groupMembersCount}>{group.members.length} miembros</Text>

                                <Pressable
                                    style={styles.manageButton}
                                    onPress={() => setEditingGroup(group)}
                                >
                                    <Text style={styles.manageButtonText}>{isOwner ? 'Gestionar' : 'Ver grupo'}</Text>
                                </Pressable>
                            </View>
                        );
                    })
                )}
            </ScrollView>

            <View style={styles.fabContainer}>
                <Pressable style={styles.fab} onPress={() => setCreateModalVisible(true)}>
                    <Text style={styles.fabText}>+ Crear Grupo</Text>
                </Pressable>
            </View>

            {/* Create Modal */}
            <Modal
                visible={isCreateModalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setCreateModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Crear nuevo grupo</Text>

                        <Text style={styles.label}>Nombre del grupo</Text>
                        <TextInput
                            style={styles.input}
                            value={newGroupName}
                            onChangeText={setNewGroupName}
                            placeholder="Ej: Programación Avanzada"
                            placeholderTextColor="#94a3b8"
                        />

                        <Text style={styles.label}>Descripción (Opcional)</Text>
                        <TextInput
                            style={[styles.input, styles.textArea]}
                            value={newGroupDesc}
                            onChangeText={setNewGroupDesc}
                            placeholder="De qué trata el grupo..."
                            placeholderTextColor="#94a3b8"
                            multiline
                            numberOfLines={3}
                        />

                        <View style={styles.modalActions}>
                            <Pressable
                                style={[styles.modalButton, styles.cancelModalButton]}
                                onPress={() => setCreateModalVisible(false)}
                                disabled={isCreating}
                            >
                                <Text style={styles.cancelModalButtonText}>Cancelar</Text>
                            </Pressable>
                            <Pressable
                                style={[styles.modalButton, styles.saveModalButton]}
                                onPress={handleCreateGroup}
                                disabled={isCreating}
                            >
                                <Text style={styles.saveModalButtonText}>{isCreating ? 'Creando...' : 'Crear'}</Text>
                            </Pressable>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8fafc',
    },
    contentContainer: {
        padding: 20,
        paddingTop: 40,
    },
    header: {
        padding: 20,
        paddingTop: 50,
        backgroundColor: '#ffffff',
        borderBottomWidth: 1,
        borderBottomColor: '#e2e8f0',
    },
    listContainer: {
        padding: 20,
        paddingBottom: 100, // space for fab
    },
    loaderContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f8fafc',
    },
    loaderText: {
        marginTop: 10,
        fontSize: 14,
        color: '#475569',
    },
    backButton: {
        marginBottom: 16,
    },
    backButtonOnly: {
        marginBottom: 8,
    },
    backButtonText: {
        color: '#2563eb',
        fontWeight: '600',
        fontSize: 15,
    },
    title: {
        fontSize: 28,
        fontWeight: '800',
        color: '#0f172a',
    },
    subtitle: {
        fontSize: 15,
        color: '#64748b',
        marginTop: 4,
        marginBottom: 16,
    },
    emptyText: {
        color: '#64748b',
        fontSize: 15,
        textAlign: 'center',
        marginTop: 40,
    },
    groupCard: {
        backgroundColor: '#ffffff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 },
        elevation: 2,
    },
    groupHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 8,
    },
    groupName: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1e293b',
        flex: 1,
    },
    groupDesc: {
        fontSize: 14,
        color: '#475569',
        marginBottom: 12,
    },
    groupMembersCount: {
        fontSize: 13,
        color: '#64748b',
        fontWeight: '500',
        marginBottom: 12,
    },
    ownerBadge: {
        backgroundColor: '#dbeafe',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        marginLeft: 8,
    },
    ownerBadgeText: {
        color: '#1d4ed8',
        fontSize: 11,
        fontWeight: '700',
    },
    manageButton: {
        backgroundColor: '#f1f5f9',
        paddingVertical: 10,
        borderRadius: 8,
        alignItems: 'center',
    },
    manageButtonText: {
        color: '#0f172a',
        fontWeight: '600',
        fontSize: 14,
    },
    fabContainer: {
        position: 'absolute',
        bottom: 24,
        left: 20,
        right: 20,
    },
    fab: {
        backgroundColor: '#2563eb',
        borderRadius: 12,
        paddingVertical: 16,
        alignItems: 'center',
        shadowColor: '#2563eb',
        shadowOpacity: 0.3,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 4 },
        elevation: 4,
    },
    fabText: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: '700',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(15, 23, 42, 0.5)',
        justifyContent: 'center',
        padding: 20,
    },
    modalContent: {
        backgroundColor: '#ffffff',
        borderRadius: 16,
        padding: 20,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#0f172a',
        marginBottom: 20,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#334155',
        marginBottom: 8,
    },
    input: {
        backgroundColor: '#f8fafc',
        borderWidth: 1,
        borderColor: '#cbd5e1',
        borderRadius: 8,
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontSize: 15,
        color: '#0f172a',
        marginBottom: 16,
    },
    textArea: {
        height: 80,
        textAlignVertical: 'top',
    },
    modalActions: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 8,
    },
    modalButton: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: 'center',
    },
    cancelModalButton: {
        backgroundColor: '#f1f5f9',
    },
    cancelModalButtonText: {
        color: '#475569',
        fontWeight: '600',
        fontSize: 15,
    },
    saveModalButton: {
        backgroundColor: '#0f172a',
    },
    saveModalButtonText: {
        color: '#ffffff',
        fontWeight: '600',
        fontSize: 15,
    },
    card: {
        backgroundColor: '#ffffff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1e293b',
        marginBottom: 12,
    },
    memberItem: {
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
    },
    memberName: {
        fontSize: 15,
        fontWeight: '600',
        color: '#0f172a',
    },
    memberCareer: {
        fontSize: 13,
        color: '#64748b',
        marginTop: 2,
    },
    searchRow: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 16,
    },
    flexInput: {
        flex: 1,
        marginBottom: 0,
    },
    searchButton: {
        backgroundColor: '#e2e8f0',
        justifyContent: 'center',
        paddingHorizontal: 16,
        borderRadius: 8,
    },
    searchButtonText: {
        color: '#0f172a',
        fontWeight: '600',
    },
    searchResults: {
        marginTop: 8,
    },
    resultItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
    },
    resultName: {
        fontSize: 15,
        fontWeight: '600',
        color: '#0f172a',
    },
    resultCareer: {
        fontSize: 13,
        color: '#64748b',
    },
    addButton: {
        backgroundColor: '#1d4ed8',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 8,
        marginLeft: 12,
    },
    addButtonText: {
        color: '#ffffff',
        fontWeight: '600',
        fontSize: 13,
    },
    noResultsText: {
        color: '#64748b',
        fontStyle: 'italic',
        marginTop: 8,
    },
});
