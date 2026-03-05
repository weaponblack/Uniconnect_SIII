import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { getStudentProfile, updateStudentProfile, type StudentProfile } from '@/lib/student-api';

export default function ProfileEditScreen() {
    const [profile, setProfile] = useState<StudentProfile | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    // Form State
    const [career, setCareer] = useState('');
    const [currentSemester, setCurrentSemester] = useState('');
    const [subjects, setSubjects] = useState<string[]>([]);
    const [newSubject, setNewSubject] = useState('');

    useEffect(() => {
        async function fetchProfile() {
            try {
                const data = await getStudentProfile();
                setProfile(data);
                setCareer(data.career || '');
                setCurrentSemester(data.currentSemester ? data.currentSemester.toString() : '');
                setSubjects(data.subjects.map((sub) => sub.name));
            } catch (error) {
                console.error('Failed to load profile', error);
            } finally {
                setIsLoading(false);
            }
        }
        fetchProfile();
    }, []);

    const handleAddSubject = () => {
        if (newSubject.trim() && !subjects.includes(newSubject.trim())) {
            setSubjects([...subjects, newSubject.trim()]);
            setNewSubject('');
        }
    };

    const handleRemoveSubject = (index: number) => {
        const updated = [...subjects];
        updated.splice(index, 1);
        setSubjects(updated);
    };

    const handleSave = async () => {
        try {
            setIsSaving(true);
            await updateStudentProfile({
                career: career.trim() || undefined,
                currentSemester: parseInt(currentSemester, 10) || undefined,
                subjects,
            });
            router.back();
        } catch (error) {
            console.error('Failed to update profile', error);
            alert('Error al guardar el perfil');
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <View style={styles.loaderContainer}>
                <ActivityIndicator />
                <Text style={styles.loaderText}>Cargando perfil...</Text>
            </View>
        );
    }

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
            <Text style={styles.title}>Editar Perfil</Text>

            <Text style={styles.label}>Carrera</Text>
            <TextInput
                style={styles.input}
                value={career}
                onChangeText={setCareer}
                placeholder="Ej: Ingeniería de Sistemas"
                placeholderTextColor="#94a3b8"
            />

            <Text style={styles.label}>Semestre actual</Text>
            <TextInput
                style={styles.input}
                value={currentSemester}
                onChangeText={setCurrentSemester}
                placeholder="Ej: 5"
                keyboardType="numeric"
                placeholderTextColor="#94a3b8"
            />

            <Text style={styles.label}>Materias inscritas</Text>
            <View style={styles.subjectInputRow}>
                <TextInput
                    style={[styles.input, styles.flexInput]}
                    value={newSubject}
                    onChangeText={setNewSubject}
                    placeholder="Ej: Cálculo III"
                    placeholderTextColor="#94a3b8"
                />
                <Pressable style={styles.addButton} onPress={handleAddSubject}>
                    <Text style={styles.addButtonLabel}>Añadir</Text>
                </Pressable>
            </View>

            {subjects.length === 0 ? (
                <Text style={styles.emptyText}>No tienes materias añadidas</Text>
            ) : (
                <View style={styles.subjectsContainer}>
                    {subjects.map((subject, index) => (
                        <View key={subject} style={styles.subjectTag}>
                            <Text style={styles.subjectText}>{subject}</Text>
                            <Pressable onPress={() => handleRemoveSubject(index)} style={styles.removeTag}>
                                <Text style={styles.removeText}>X</Text>
                            </Pressable>
                        </View>
                    ))}
                </View>
            )}

            <Pressable style={styles.saveButton} disabled={isSaving} onPress={handleSave}>
                <Text style={styles.saveButtonLabel}>{isSaving ? 'Guardando...' : 'Guardar Cambios'}</Text>
            </Pressable>

            <Pressable style={styles.cancelButton} disabled={isSaving} onPress={() => router.back()}>
                <Text style={styles.cancelButtonLabel}>Cancelar</Text>
            </Pressable>
        </ScrollView>
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
    title: {
        fontSize: 28,
        fontWeight: '800',
        color: '#0f172a',
        marginBottom: 24,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#334155',
        marginBottom: 8,
    },
    input: {
        backgroundColor: '#ffffff',
        borderWidth: 1,
        borderColor: '#cbd5e1',
        borderRadius: 8,
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontSize: 15,
        color: '#0f172a',
        marginBottom: 16,
    },
    flexInput: {
        flex: 1,
        marginBottom: 0,
    },
    subjectInputRow: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 12,
    },
    addButton: {
        backgroundColor: '#045389',
        justifyContent: 'center',
        paddingHorizontal: 16,
        borderRadius: 8,
    },
    addButtonLabel: {
        color: '#ffffff',
        fontWeight: '600',
    },
    emptyText: {
        color: '#94a3b8',
        fontStyle: 'italic',
        marginBottom: 16,
    },
    subjectsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 24,
    },
    subjectTag: {
        backgroundColor: '#e0e7ff',
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 6,
        paddingHorizontal: 10,
        borderRadius: 16,
    },
    subjectText: {
        color: '#3730a3',
        fontWeight: '500',
        fontSize: 13,
    },
    removeTag: {
        marginLeft: 6,
        backgroundColor: '#c7d2fe',
        borderRadius: 10,
        width: 20,
        height: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    removeText: {
        fontSize: 10,
        color: '#312e81',
        fontWeight: 'bold',
    },
    saveButton: {
        backgroundColor: '#003e70',
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
        marginBottom: 12,
    },
    saveButtonLabel: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: '700',
    },
    cancelButton: {
        backgroundColor: '#bcbcbcff',
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    cancelButtonLabel: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: '600',
    },
});
