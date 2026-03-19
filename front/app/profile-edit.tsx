import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View, Keyboard } from 'react-native';
import { useToast } from '@/components/Toast';
import { router } from 'expo-router';
import { getStudentProfile, updateStudentProfile, type StudentProfile } from '@/lib/student-api';

const normalizeString = (str: string) => {
    if (!str) return '';
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
};

const CARRERAS = [
    "Administración de empresas agropecuarias",
    "Biología",
    "Diseño visual",
    "Enfermería",
    "Historia",
    "Ingeniería agronomica",
    "Ingeniería de alimentos",
    "Ingeniería de sistemas y computación",
    "Ingeniería en informatica",
    "Licenciatura en artes escénicas",
    "Licenciatura en ciencias naturales",
    "Licenciatura en ciencias sociales",
    "Licenciatura en educación física",
    "Licenciatura en filosofía",
    "Licenciatura en lenguas modernas",
    "Licenciatura en música",
    "Maestro en artes plasticas",
    "Maestro en música",
    "Medicina",
    "Medicina veterinaria y zootecnia",
    "Administración financiera",
    "Antropología",
    "Desarrollo familiar",
    "Derecho",
    "Sociología",
    "Trabajo social",
    "Profesional en filosofía",
    "Geología"
];

const MATERIAS_SISTEMAS = [
    "Constitución Política De Colombia",
    "Lógica Matemática",
    "Opcionales",
    "Matemáticas Discretas Ii",
    "Matemáticas Fundamentales",
    "Cálculo I",
    "Cálculo Ii",
    "Cálculo Iii",
    "Matemáticas Especiales",
    "Álgebra Lineal",
    "Matemáticas Discretas",
    "Probabilidad",
    "Física Ii-Ing",
    "Física I Ing",
    "Física Iii Ing",
    "Laboratorio De Física I Ing",
    "Laboratorio De Física Ii Ing",
    "Laboratorio Fisica I Ing",
    "Laboratorio Fisica Ii Ing",
    "Biologia Para Ingenieria",
    "Programacion I",
    "Programación Ii",
    "Programacion Iii",
    "Programación Concurrente Y Distribuida",
    "Teoría General De Sistemas",
    "Autómatas Y Lenguajes Formales",
    "Estructura De Lenguajes",
    "Sistemas Inteligentes I",
    "Sistemas Inteligentes Ii",
    "Análisis Y Diseño De Algoritmos",
    "Investigación Para Ingeniería",
    "Introducción A La Ingeniería De Sistemas Y Computación",
    "Inglés Para Ingeniería",
    "Automatización Y Control De Procesos",
    "Sistemas Operativos",
    "Comunicaciones De Datos",
    "Redes De Computadores I",
    "Redes De Computadores Iii",
    "Redes De Computadores Ii",
    "Ingeniería De Software I",
    "Ingeniería De Software Ii",
    "Ingeniería De Software Iii",
    "Arquitectura De Computadores",
    "Circuitos Digitales",
    "Microprocesadores",
    "Diseño De Interfaces",
    "Practica",
    "Seguridad Informática",
    "Auditoría Informática",
    "Proyecto Integrador",
    "Gestión Tecnológica",
    "Gestion De Proyectos",
    "Bases De Datos I",
    "Estructuras De Datos",
    "Administración De Sistemas",
    "Bases De Datos Ii",
    "Ingeniería Del Conocimiento",
    "Habilidades Gerenciales",
    "Ingeniería Económica Y Financiera",
    "Investigación De Mercados",
    "Investigación De Operaciones",
    "Implantación Y Aplicación De La Gestión Del Conocimiento",
    "Framework Laravel Para Desarrollo Web",
    "Framework Spring Para Desarrollo Web",
    "Taller De Pruebas De Software",
    "Desarrollo Avanzado Aplicaciones Web Con Asp.Net Mvc 5",
    "Social Network Analysis",
    "Habilidades Blandas Para Ingeniería De Sistemas Y Computación",
    "Database Sql Expert",
    "Taller De Sistemas Operativos",
    "Modelado Computacional De Sistemas Físicos Y Biológicos",
    "Programacion Para Dispositivos Moviles",
    "Rotaciones En Sistemas Y Computacion",
    "Procesamiento Digital De Imágenes",
    "Inteligencia De Negocios",
    "Vision Artificial En Tiempo Real",
    "Web Semántica",
    "Laboratorio De Soa",
    "Industralización De Software",
    "Emprendimiento Y Creacion De Empresas De Base Tecnologica",
    "Calidad En El Desarrollo De Software",
    "Arquitectura Empresarial",
    "Fundamentos De Ingeniería Biomédica",
    "Desarrollo De Videojuegos",
    "Introducción A La Robótica"
];

export default function ProfileEditScreen() {
    const { showToast } = useToast();
    const [profile, setProfile] = useState<StudentProfile | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    // Form State
    const [career, setCareer] = useState('');
    const [currentSemester, setCurrentSemester] = useState('');
    const [subjects, setSubjects] = useState<string[]>([]);
    const [newSubject, setNewSubject] = useState('');
    const [showCarreras, setShowCarreras] = useState(false);
    const [showSubjects, setShowSubjects] = useState(false);

    const filteredCarreras = useMemo(() => {
        if (!career) return CARRERAS;
        const searchNorm = normalizeString(career);
        return CARRERAS.filter(c => normalizeString(c).includes(searchNorm));
    }, [career]);

    const isSistemas = normalizeString(career) === normalizeString("Ingeniería de sistemas y computación");

    const filteredSubjects = useMemo(() => {
        if (!isSistemas) return [];
        const searchNorm = normalizeString(newSubject);
        return MATERIAS_SISTEMAS.filter(s => normalizeString(s).includes(searchNorm) && !subjects.includes(s));
    }, [newSubject, subjects, isSistemas]);

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
        const trimmed = newSubject.trim();
        if (!trimmed) return;

        if (isSistemas) {
            const searchNorm = normalizeString(trimmed);
            const match = MATERIAS_SISTEMAS.find(m => normalizeString(m) === searchNorm);
            if (match && !subjects.includes(match)) {
                setSubjects([...subjects, match]);
                setNewSubject('');
                setShowSubjects(false);
            } else {
                Alert.alert('Materia no válida', 'Por favor selecciona una materia de la lista sugerida para tu carrera.');
            }
        } else {
            if (!subjects.includes(trimmed)) {
                setSubjects([...subjects, trimmed]);
                setNewSubject('');
            }
        }
    };

    const handleRemoveSubject = (index: number) => {
        const updated = [...subjects];
        updated.splice(index, 1);
        setSubjects(updated);
    };

    const handleSave = async () => {
        if (career.trim() && !CARRERAS.includes(career.trim())) {
            Alert.alert('Error', 'Por favor selecciona una carrera sugerida de la lista.');
            return;
        }

        if (currentSemester.trim() !== '') {
            const sem = parseInt(currentSemester, 10);
            if (isNaN(sem) || sem < 0 || sem > 10) {
                Alert.alert('Error', 'El semestre debe ser un número entre 0 y 10.');
                return;
            }
        }

        try {
            setIsSaving(true);
            await updateStudentProfile({
                career: career.trim() || undefined,
                currentSemester: parseInt(currentSemester, 10) || undefined,
                subjects,
            });
            showToast('Perfil actualizado correctamente', 'success');
            router.back();
        } catch (error) {
            console.error('Failed to update profile', error);
            showToast('Error al guardar el perfil', 'error');
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
        <ScrollView
            style={styles.container}
            contentContainerStyle={styles.contentContainer}
            keyboardShouldPersistTaps="handled"
        >
            <Text style={styles.title}>Editar Perfil</Text>

            <View style={{ zIndex: 10 }}>
                <Text style={styles.label}>Carrera</Text>
                <TextInput
                    style={styles.input}
                    value={career}
                    onChangeText={(text) => {
                        setCareer(text);
                        setShowCarreras(true);
                        // If they change career, clear subjects?
                        // Optional: clear subjects when changing career
                    }}
                    onFocus={() => setShowCarreras(true)}
                    onBlur={() => setTimeout(() => setShowCarreras(false), 200)}
                    placeholder="Selecciona tu carrera"
                    placeholderTextColor="#94a3b8"
                />
                {showCarreras && filteredCarreras.length > 0 && (
                    <ScrollView nestedScrollEnabled={true} style={styles.suggestionsContainer}>
                        {filteredCarreras.map((item, index) => (
                            <Pressable
                                key={index}
                                style={styles.suggestionItem}
                                onPress={() => {
                                    if (item !== career) {
                                        setCareer(item);
                                        // Auto-clear subjects if career changes to something else to prevent invalid subjects
                                        setSubjects([]);
                                    } else {
                                        setCareer(item);
                                    }
                                    setShowCarreras(false);
                                }}>
                                <Text style={styles.suggestionText}>{item}</Text>
                            </Pressable>
                        ))}
                    </ScrollView>
                )}
            </View>

            <Text style={styles.label}>Semestre actual</Text>
            <TextInput
                style={[
                    styles.input, 
                    currentSemester !== '' && (parseInt(currentSemester, 10) < 0 || parseInt(currentSemester, 10) > 10) ? { borderColor: '#ef4444' } : null
                ]}
                value={currentSemester}
                onChangeText={(text) => {
                    const numeric = text.replace(/[^0-9]/g, '');
                    setCurrentSemester(numeric);
                }}
                placeholder="Ej: 5"
                keyboardType="numeric"
                placeholderTextColor="#94a3b8"
            />
            {currentSemester !== '' && (parseInt(currentSemester, 10) < 0 || parseInt(currentSemester, 10) > 10) && (
                <Text style={styles.errorText}>El semestre debe ser un número entre 0 y 10</Text>
            )}

            <View style={{ zIndex: 9 }}>
                <Text style={styles.label}>Materias inscritas</Text>

                {!career ? (
                    <Text style={styles.infoText}>Selecciona tu carrera primero</Text>
                ) : (!isSistemas ? (
                    <Text style={styles.infoText}>El catálogo de materias para tu carrera aún no está disponible, ingresalas manualmente por favor.</Text>
                ) : null)}

                {career ? (
                    <View style={styles.subjectInputRow}>
                        <TextInput
                            style={[styles.input, styles.flexInput]}
                            value={newSubject}
                            onChangeText={(text) => {
                                setNewSubject(text);
                                setShowSubjects(true);
                            }}
                            onFocus={() => setShowSubjects(true)}
                            onBlur={() => setTimeout(() => setShowSubjects(false), 200)}
                            placeholder="Buscar materia..."
                            placeholderTextColor="#94a3b8"
                        />
                        {!isSistemas && (
                            <Pressable style={styles.addButton} onPress={handleAddSubject}>
                                <Text style={styles.addButtonLabel}>Añadir</Text>
                            </Pressable>
                        )}
                    </View>
                ) : null}

                {showSubjects && isSistemas && filteredSubjects.length > 0 && (
                    <ScrollView nestedScrollEnabled={true} style={[styles.suggestionsContainer, { top: 70 }]}>
                        {filteredSubjects.slice(0, 50).map((item, index) => (
                            <Pressable
                                key={index}
                                style={styles.suggestionItem}
                                onPress={() => {
                                    if (!subjects.includes(item)) {
                                        setSubjects([...subjects, item]);
                                    }
                                    setNewSubject('');
                                    setShowSubjects(false);
                                }}>
                                <Text style={styles.suggestionText}>{item}</Text>
                            </Pressable>
                        ))}
                    </ScrollView>
                )}
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
    infoText: {
        color: '#64748b',
        fontSize: 13,
        marginBottom: 12,
        fontStyle: 'italic',
    },
    errorText: {
        color: '#ef4444',
        fontSize: 13,
        marginTop: -12,
        marginBottom: 16,
        marginLeft: 4,
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
    suggestionsContainer: {
        maxHeight: 200,
        backgroundColor: '#ffffff',
        borderWidth: 1,
        borderColor: '#cbd5e1',
        borderRadius: 8,
        marginTop: -12,
        marginBottom: 16,
        overflow: 'hidden',
        position: 'absolute',
        top: 70, // Below the input field
        left: 0,
        right: 0,
        zIndex: 20,
        elevation: 5,
        boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)',
    },
    suggestionItem: {
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
    },
    suggestionText: {
        fontSize: 15,
        color: '#334155',
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
