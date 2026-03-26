import { useEffect, useState, useCallback } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View, Modal, Platform, Keyboard, KeyboardAvoidingView } from 'react-native';
import { useToast } from '@/components/Toast';
import { Stack, router, useFocusEffect } from 'expo-router';
import { loadSession, type SessionData } from '@/lib/session';
import {
    getStudentStudyGroups,
    createStudyGroup,
    updateStudyGroup,
    addMembersToStudyGroup,
    removeMemberFromStudyGroup,
    searchStudentsByName,
    deleteStudyGroup,
    getStudyGroupResources,
    addStudyGroupResource,
    deleteStudyGroupResource,
    type StudyGroup,
    type StudyGroupMember,
    type StudyGroupResource
} from '@/lib/study-group-api';
import { authConfig } from '@/constants/AuthConfig';
import * as DocumentPicker from 'expo-document-picker';
import * as Linking from 'expo-linking';
import { Ionicons } from '@expo/vector-icons';

export default function StudyGroupsScreen() {
    const { showToast } = useToast();
    const [session, setSession] = useState<SessionData | null>(null);
    const [groups, setGroups] = useState<StudyGroup[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const [isCreateModalVisible, setCreateModalVisible] = useState(false);
    const [newGroupName, setNewGroupName] = useState('');
    const [newGroupDesc, setNewGroupDesc] = useState('');
    const [isCreating, setIsCreating] = useState(false);

    // Edit state
    const [editingGroup, setEditingGroup] = useState<StudyGroup | null>(null);
    const [showAllMembers, setShowAllMembers] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<StudyGroupMember[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [isAddingMember, setIsAddingMember] = useState(false);
    const [isRemovingMember, setIsRemovingMember] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // Group info edit state
    const [editInfoName, setEditInfoName] = useState('');
    const [editInfoDesc, setEditInfoDesc] = useState('');
    const [isUpdatingInfo, setIsUpdatingInfo] = useState(false);

    // Resources state
    const [resources, setResources] = useState<StudyGroupResource[]>([]);
    const [isLoadingResources, setIsLoadingResources] = useState(false);
    const [isResourceModalVisible, setResourceModalVisible] = useState(false);
    const [resourceType, setResourceType] = useState<'PDF' | 'LINK'>('PDF');
    const [resourceTitle, setResourceTitle] = useState('');
    const [resourceLink, setResourceLink] = useState('');
    const [isUploadingResource, setIsUploadingResource] = useState(false);

    const loadResources = async (groupId: string) => {
        setIsLoadingResources(true);
        try {
            const data = await getStudyGroupResources(groupId);
            setResources(data);
        } catch (error) {
            console.error('Failed to load resources', error);
        } finally {
            setIsLoadingResources(false);
        }
    };

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
        const trimmedName = newGroupName.trim();
        if (!trimmedName) return;

        if (trimmedName.length < 3) {
            showToast('El nombre del grupo debe tener al menos 3 caracteres', 'error');
            return;
        }

        try {
            setIsCreating(true);
            const created = await createStudyGroup({
                name: trimmedName,
                description: newGroupDesc.trim() || undefined,
            });
            setGroups([created, ...groups]);
            setCreateModalVisible(false);
            setNewGroupName('');
            setNewGroupDesc('');
            showToast('Grupo creado con éxito', 'success');
        } catch (error: any) {
            console.error('Error creating group', error);
            // errorHandler already shows an Alert in the apiClient interceptor, 
            // but we can provide more context here if needed.
            if (error.response?.data?.message) {
                // The global errorHandler will show this, but we'll log it for debugging
            }
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
            showToast('Error al buscar estudiantes', 'error');
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
            showToast('Estudiante añadido', 'success');
        } catch (error) {
            console.error('Add member error', error);
            showToast('Error al añadir miembro', 'error');
        } finally {
            setIsAddingMember(false);
        }
    };

    const handleRemoveMember = async (memberId: string, memberName: string) => {
        if (!editingGroup) return;

        const performRemove = async () => {
            try {
                setIsRemovingMember(memberId);
                const updatedGroup = await removeMemberFromStudyGroup(editingGroup.id, memberId);
                setEditingGroup(updatedGroup);
                setGroups(groups.map(g => (g.id === updatedGroup.id ? updatedGroup : g)));
                showToast('Miembro eliminado', 'success');
            } catch (error) {
                console.error('Remove member error', error);
                showToast('No se pudo eliminar al miembro', 'error');
            } finally {
                setIsRemovingMember(null);
            }
        };

        if (Platform.OS === 'web') {
            if (window.confirm(`¿Seguro que deseas eliminar a ${memberName} del grupo?`)) {
                void performRemove();
            }
        } else {
            // Keep Alert for confirmation since it's a destructive action
            const { Alert } = require('react-native');
            Alert.alert(
                'Eliminar miembro',
                `¿Seguro que deseas eliminar a ${memberName} del grupo?`,
                [
                    { text: 'Cancelar', style: 'cancel' },
                    { text: 'Eliminar', style: 'destructive', onPress: () => void performRemove() },
                ]
            );
        }
    };

    const handleDeleteGroup = async () => {
        if (!editingGroup) return;

        const performDelete = async () => {
            try {
                setIsDeleting(true);
                await deleteStudyGroup(editingGroup.id);
                setGroups(groups.filter(g => g.id !== editingGroup.id));
                setEditingGroup(null);
                showToast('El grupo ha sido eliminado', 'success');
            } catch (error) {
                console.error('Delete group error', error);
                showToast('No se pudo eliminar el grupo', 'error');
            } finally {
                setIsDeleting(false);
            }
        };

        if (Platform.OS === 'web') {
            if (window.confirm(`¿Estás seguro de que deseas eliminar el grupo "${editingGroup.name}"? Esta acción no se puede deshacer.`)) {
                void performDelete();
            }
        } else {
            // Keep Alert for confirmation
            const { Alert } = require('react-native');
            Alert.alert(
                'Eliminar Grupo',
                `¿Estás seguro de que deseas eliminar el grupo "${editingGroup.name}"? Esta acción no se puede deshacer.`,
                [
                    { text: 'Cancelar', style: 'cancel' },
                    { text: 'Eliminar', style: 'destructive', onPress: () => void performDelete() },
                ]
            );
        }
    };

    const handleUpdateGroupInfo = async () => {
        if (!editingGroup || !editInfoName.trim()) return;
        try {
            setIsUpdatingInfo(true);
            const updated = await updateStudyGroup(editingGroup.id, {
                name: editInfoName.trim(),
                description: editInfoDesc.trim(),
            });
            setEditingGroup(updated);
            setGroups(groups.map(g => (g.id === updated.id ? updated : g)));
            showToast('Información del grupo actualizada', 'success');
        } catch (error) {
            console.error('Update group info error', error);
            showToast('No se pudo actualizar la información del grupo', 'error');
        } finally {
            setIsUpdatingInfo(false);
        }
    };

    const handleAddResource = async () => {
        if (!editingGroup) return;
        if (!resourceTitle.trim()) {
            showToast('El título es obligatorio', 'error');
            return;
        }

        try {
            setIsUploadingResource(true);
            const formData = new FormData();
            formData.append('title', resourceTitle.trim());
            formData.append('type', resourceType);

            if (resourceType === 'LINK') {
                if (!resourceLink.trim()) {
                    showToast('El enlace es obligatorio', 'error');
                    setIsUploadingResource(false);
                    return;
                }
                formData.append('url', resourceLink.trim());
            } else {
                // Pick Document
                const result = await DocumentPicker.getDocumentAsync({
                    type: 'application/pdf',
                    copyToCacheDirectory: true,
                });

                if (result.canceled || !result.assets || result.assets.length === 0) {
                    showToast('Selección de archivo cancelada', 'error');
                    setIsUploadingResource(false);
                    return;
                }

                const file = result.assets[0];
                if (Platform.OS === 'web' && file.file) {
                    // On Web, DocumentPicker provides the native File object inside the asset.
                    formData.append('file', file.file);
                } else {
                    // On Mobile (iOS/Android), use the react-native polyfill format.
                    formData.append('file', {
                        uri: Platform.OS === 'android' ? file.uri : file.uri.replace('file://', ''),
                        name: file.name,
                        type: file.mimeType || 'application/pdf',
                    } as any);
                }
            }

            const newResource = await addStudyGroupResource(editingGroup.id, formData);
            setResources([newResource, ...resources]);
            setResourceModalVisible(false);
            setResourceTitle('');
            setResourceLink('');
            showToast('Recurso añadido', 'success');
        } catch (error) {
            console.error('Resource upload fail', error);
            showToast('No se pudo subir el recurso', 'error');
        } finally {
            setIsUploadingResource(false);
        }
    };

    if (isLoading || !session) {
        return (
            <View style={styles.loaderContainer}>
                <Stack.Screen 
                    options={{ 
                        title: 'Grupos de Estudio',
                        headerLeft: () => (
                            <Pressable 
                                onPress={() => router.replace('/dashboard')}
                                style={{ padding: 8, marginLeft: Platform.OS === 'ios' ? -8 : 0, flexDirection: 'row', alignItems: 'center' }}
                            >
                                <Ionicons name={Platform.OS === 'ios' ? "chevron-back" : "arrow-back"} size={26} color="#ffffff" />
                            </Pressable>
                        )
                    }} 
                />
                <ActivityIndicator />
                <Text style={styles.loaderText}>Cargando grupos...</Text>
            </View>
        );
    }

    if (editingGroup) {
        // Edit mode UI
        return (
            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
            >
                <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer} keyboardShouldPersistTaps="handled">
                <Stack.Screen 
                    options={{ 
                        title: 'Gestionar Grupo',
                        headerLeft: () => (
                            <Pressable 
                                onPress={() => { setEditingGroup(null); setSearchQuery(''); setSearchResults([]); }}
                                style={{ padding: 8, marginLeft: Platform.OS === 'ios' ? -8 : 0, flexDirection: 'row', alignItems: 'center' }}
                            >
                                <Ionicons name={Platform.OS === 'ios' ? "chevron-back" : "arrow-back"} size={26} color="#ffffff" />
                            </Pressable>
                        )
                    }} 
                />

                {session.user.id === editingGroup.ownerId ? (
                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>Información del Grupo</Text>
                        <Text style={styles.label}>Nombre</Text>
                        <TextInput
                            style={styles.input}
                            value={editInfoName}
                            onChangeText={setEditInfoName}
                            placeholder="Nombre del grupo"
                        />
                        <Text style={styles.label}>Descripción</Text>
                        <TextInput
                            style={[styles.input, styles.textArea]}
                            value={editInfoDesc}
                            onChangeText={setEditInfoDesc}
                            placeholder="Descripción del grupo"
                            multiline
                        />
                        <Pressable
                            style={[styles.saveChangesButton, isUpdatingInfo && { opacity: 0.6 }]}
                            onPress={handleUpdateGroupInfo}
                            disabled={isUpdatingInfo}
                        >
                            <Text style={styles.saveChangesButtonText}>
                                {isUpdatingInfo ? 'Guardando...' : 'Guardar Cambios'}
                            </Text>
                        </Pressable>
                    </View>
                ) : (
                    <>
                        <Text style={styles.title}>Gestionar: {editingGroup.name}</Text>
                        <Text style={styles.subtitle}>{editingGroup.description || 'Sin descripción'}</Text>
                    </>
                )}

                <View style={styles.card}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                        <Text style={[styles.cardTitle, { marginBottom: 0 }]}>Recursos Compartidos</Text>
                        <Pressable style={styles.addResourceButton} onPress={() => setResourceModalVisible(true)}>
                            <Text style={styles.addResourceButtonText}>+ Añadir</Text>
                        </Pressable>
                    </View>

                    {isLoadingResources ? (
                        <ActivityIndicator />
                    ) : resources.length === 0 ? (
                        <Text style={styles.emptyText}>No hay recursos en este grupo</Text>
                    ) : (
                        resources.map(res => (
                            <View key={res.id} style={styles.resourceItem}>
                                <View style={styles.resourceIconContainer}>
                                    <Ionicons name={res.type === 'PDF' ? "document-text" : "link"} size={24} color="#003e70" />
                                </View>
                                <View style={{ flex: 1, marginLeft: 12 }}>
                                    <Text style={styles.resourceTitle}>{res.title}</Text>
                                    <View style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}>
                                        <Text style={styles.resourceType}>{res.type}</Text>
                                        <Text style={styles.resourceDate}>{new Date(res.createdAt).toLocaleDateString()}</Text>
                                    </View>
                                </View>
                                <Pressable
                                    style={styles.openResourceButton}
                                    onPress={() => {
                                        const finalUrl = res.url.startsWith('/') ? `${authConfig.backendUrl}${res.url}` : res.url;
                                        Linking.openURL(finalUrl);
                                    }}
                                >
                                    <Text style={styles.openResourceButtonText}>Abrir</Text>
                                </Pressable>
                                {((session?.user.id === res.uploaderId) || (session?.user.id === editingGroup.ownerId)) && (
                                    <Pressable
                                        style={styles.deleteResourceButton}
                                        onPress={async () => {
                                            try {
                                                await deleteStudyGroupResource(editingGroup.id, res.id);
                                                setResources(resources.filter(r => r.id !== res.id));
                                                showToast('Recurso eliminado', 'success');
                                            } catch (e) {
                                                showToast('Error al eliminar', 'error');
                                            }
                                        }}
                                    >
                                        <Ionicons name="trash-outline" size={20} color="#ef4444" />
                                    </Pressable>
                                )}
                            </View>
                        ))
                    )}
                </View>

                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Miembros actuales ({editingGroup.members.length})</Text>
                    {editingGroup.members.map((member) => (
                        <View key={member.id} style={styles.memberItem}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.memberName}>{member.name || member.email}</Text>
                                    <Text style={styles.memberCareer}>{member.career || 'Sin carrera'} • Semestre {member.currentSemester || '?'}</Text>
                                    {member.id === editingGroup.ownerId ? (
                                        <View style={styles.ownerBadge}><Text style={styles.ownerBadgeText}>Administrador</Text></View>
                                    ) : null}
                                </View>
                                {session.user.id === editingGroup.ownerId && member.id !== editingGroup.ownerId && (
                                    <Pressable
                                        onPress={() => handleRemoveMember(member.id, member.name || member.email)}
                                        disabled={isRemovingMember === member.id}
                                        style={styles.removeMemberButton}
                                    >
                                        <Text style={styles.removeMemberButtonText}>
                                            {isRemovingMember === member.id ? '...' : 'Eliminar'}
                                        </Text>
                                    </Pressable>
                                )}
                            </View>
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
                            <ScrollView style={styles.searchResults} nestedScrollEnabled={true} keyboardShouldPersistTaps="handled">
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
                            </ScrollView>
                        )}
                        {searchResults.length === 0 && searchQuery.trim() !== '' && !isSearching && (
                            <Text style={styles.noResultsText}>No se encontraron resultados nuevos.</Text>
                        )}
                    </View>
                )}

                {session.user.id === editingGroup.ownerId && (
                    <Pressable
                        style={[styles.deleteButton, isDeleting && { opacity: 0.6 }]}
                        onPress={handleDeleteGroup}
                        disabled={isDeleting}
                    >
                        <Text style={styles.deleteButtonText}>
                            {isDeleting ? 'Eliminando...' : 'Eliminar Grupo'}
                        </Text>
                    </Pressable>
                )}

                {/* Resource Modal */}
                <Modal
                    visible={isResourceModalVisible}
                    animationType="slide"
                    transparent={true}
                    onRequestClose={() => setResourceModalVisible(false)}
                >
                    <KeyboardAvoidingView
                        style={{ flex: 1 }}
                        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                    >
                        <View style={styles.modalOverlay}>
                        <View style={styles.modalContent}>
                            <Text style={styles.modalTitle}>Añadir Recurso</Text>

                            <View style={styles.typeSelector}>
                                <Pressable
                                    style={[styles.typeButton, resourceType === 'PDF' && styles.typeButtonActive]}
                                    onPress={() => setResourceType('PDF')}
                                >
                                    <Text style={[styles.typeButtonText, resourceType === 'PDF' && styles.typeButtonTextActive]}>Archivo PDF</Text>
                                </Pressable>
                                <Pressable
                                    style={[styles.typeButton, resourceType === 'LINK' && styles.typeButtonActive]}
                                    onPress={() => setResourceType('LINK')}
                                >
                                    <Text style={[styles.typeButtonText, resourceType === 'LINK' && styles.typeButtonTextActive]}>Enlace Web</Text>
                                </Pressable>
                            </View>

                            <Text style={styles.label}>Título</Text>
                            <TextInput
                                style={styles.input}
                                value={resourceTitle}
                                onChangeText={setResourceTitle}
                                placeholder={resourceType === 'PDF' ? "Ej: Apuntes Tema 1" : "Ej: Video explicativo"}
                                placeholderTextColor="#94a3b8"
                            />

                            {resourceType === 'LINK' && (
                                <>
                                    <Text style={styles.label}>URL del enlace</Text>
                                    <TextInput
                                        style={styles.input}
                                        value={resourceLink}
                                        onChangeText={setResourceLink}
                                        placeholder="https://..."
                                        placeholderTextColor="#94a3b8"
                                        autoCapitalize="none"
                                        keyboardType="url"
                                    />
                                </>
                            )}
                            {resourceType === 'PDF' && (
                                <Text style={styles.subtitle}>Al presionar 'Añadir', se abrirá el explorador de archivos para escoger tu PDF.</Text>
                            )}

                            <View style={styles.modalActions}>
                                <Pressable
                                    style={[styles.modalButton, styles.cancelModalButton]}
                                    onPress={() => setResourceModalVisible(false)}
                                    disabled={isUploadingResource}
                                >
                                    <Text style={styles.cancelModalButtonText}>Cancelar</Text>
                                </Pressable>
                                <Pressable
                                    style={[styles.modalButton, styles.saveModalButton]}
                                    onPress={handleAddResource}
                                    disabled={isUploadingResource}
                                >
                                    <Text style={styles.saveModalButtonText}>{isUploadingResource ? 'Procesando...' : 'Añadir'}</Text>
                                </Pressable>
                            </View>
                        </View>
                    </View>
                    </KeyboardAvoidingView>
                </Modal>
            </ScrollView>
            </KeyboardAvoidingView>
        );
    }

    // List mode UI
    return (
        <View style={styles.container}>
            <Stack.Screen 
                options={{ 
                    title: 'Grupos de Estudio',
                    headerLeft: () => (
                        <Pressable 
                            onPress={() => router.replace('/dashboard')}
                            style={{ padding: 8, marginLeft: Platform.OS === 'ios' ? -8 : 0, flexDirection: 'row', alignItems: 'center' }}
                        >
                            <Ionicons name={Platform.OS === 'ios' ? "chevron-back" : "arrow-back"} size={26} color="#ffffff" />
                        </Pressable>
                    )
                }} 
            />
            <View style={styles.header}>
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
                                            <Text style={styles.ownerBadgeText}>Administrador</Text>
                                        </View>
                                    )}
                                </View>
                                {!!group.description && <Text style={styles.groupDesc}>{group.description}</Text>}
                                <Text style={styles.groupMembersCount}>{group.members.length} miembros</Text>
                                <Pressable
                                    style={styles.manageButton}
                                    onPress={() => {
                                        setEditingGroup(group);
                                        setEditInfoName(group.name);
                                        setEditInfoDesc(group.description || '');
                                        loadResources(group.id);
                                    }}
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
                    <Text style={styles.fabText}>Crear Grupo</Text>
                </Pressable>
            </View>

            {/* Create Modal */}
            <Modal
                visible={isCreateModalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setCreateModalVisible(false)}
            >
                <KeyboardAvoidingView
                    style={{ flex: 1 }}
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
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
                </KeyboardAvoidingView>
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
        color: '#003e70',
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
        boxShadow: '0px 4px 10px rgba(0, 0, 0, 0.05)',
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
        marginTop: 8,
        alignSelf: 'flex-start',
    },
    ownerBadgeText: {
        color: '#1d4ed8',
        fontSize: 11,
        fontWeight: '700',
    },
    removeMemberButton: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 6,
        backgroundColor: '#fee2e2',
    },
    removeMemberButtonText: {
        color: '#ef4444',
        fontSize: 12,
        fontWeight: '600',
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
        backgroundColor: '#003e70',
        borderRadius: 12,
        paddingVertical: 16,
        alignItems: 'center',
        boxShadow: '0px 4px 8px rgba(0, 62, 112, 0.3)',
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
    saveChangesButton: {
        backgroundColor: '#003e70',
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 16,
        marginBottom: 8,
    },
    saveChangesButtonText: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: '700',
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
        marginTop: 12,
        maxHeight: 220,
        backgroundColor: '#ffffff',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        paddingHorizontal: 8,
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
    deleteButton: {
        backgroundColor: '#fee2e2',
        borderWidth: 1,
        borderColor: '#ef4444',
        paddingVertical: 14,
        borderRadius: 8,
        alignItems: 'center',
        marginTop: 8,
        marginBottom: 20,
    },
    deleteButtonText: {
        color: '#dc2626',
        fontWeight: '700',
        fontSize: 15,
    },
    addResourceButton: {
        backgroundColor: '#f1f5f9',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
    },
    addResourceButtonText: {
        color: '#003e70',
        fontWeight: '600',
        fontSize: 13,
    },
    resourceItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
    },
    resourceIconContainer: {
        backgroundColor: '#e0f2fe',
        padding: 8,
        borderRadius: 8,
    },
    resourceTitle: {
        fontSize: 15,
        fontWeight: '600',
        color: '#0f172a',
    },
    resourceType: {
        fontSize: 12,
        fontWeight: '700',
        color: '#003e70',
        backgroundColor: '#e2e8f0',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        overflow: 'hidden',
    },
    resourceDate: {
        fontSize: 12,
        color: '#64748b',
        marginTop: 2,
    },
    openResourceButton: {
        backgroundColor: '#e2e8f0',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 6,
        marginRight: 8,
    },
    openResourceButtonText: {
        color: '#0f172a',
        fontWeight: '600',
        fontSize: 12,
    },
    deleteResourceButton: {
        padding: 6,
        backgroundColor: '#fee2e2',
        borderRadius: 6,
    },
    typeSelector: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 16,
    },
    typeButton: {
        flex: 1,
        paddingVertical: 10,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#cbd5e1',
        alignItems: 'center',
    },
    typeButtonActive: {
        backgroundColor: '#003e70',
        borderColor: '#003e70',
    },
    typeButtonText: {
        color: '#475569',
        fontWeight: '600',
    },
    typeButtonTextActive: {
        color: '#ffffff',
    },
});
