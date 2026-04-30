import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, TextInput, Modal, ActivityIndicator, Linking, Keyboard, TouchableWithoutFeedback, ScrollView } from 'react-native';
import { useLocalSearchParams, Stack, router } from 'expo-router';
import { postApi, type Post } from '@/lib/post-api';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { loadSession, type SessionData } from '@/lib/session';
import { useToast } from '@/components/Toast';
import { authConfig } from '@/constants/AuthConfig';
import { useNotifications } from '@/context/NotificationContext';

export default function StudyGroupWall() {
  const { id, title, ownerId: groupOwnerId } = useLocalSearchParams<{ id: string, title?: string, ownerId?: string }>();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<SessionData | null>(null);
  const { showToast } = useToast();

  const [isModalVisible, setModalVisible] = useState(false);
  const [postTitle, setPostTitle] = useState('');
  const [postContent, setPostContent] = useState('');
  const [postType, setPostType] = useState('GENERAL');
  const [files, setFiles] = useState<any[]>([]);
  const [isPosting, setIsPosting] = useState(false);

  const { socket } = useNotifications();

  useEffect(() => {
    loadSession().then(setSession);
    loadPosts();
  }, [id]);

  useEffect(() => {
    if (!socket) return;

    const onTransferAccepted = (data: any) => {
      if (data.groupId === id) {
        // We were kicked out of the group, redirect to dashboard
        router.replace('/dashboard');
        showToast(`Has dejado el grupo "${data.groupName}"`, 'info');
      }
    };

    socket.on('ownership-transfer-accepted', onTransferAccepted);

    return () => {
      socket.off('ownership-transfer-accepted', onTransferAccepted);
    };
  }, [socket, id]);

  const loadPosts = async () => {
    try {
      setLoading(true);
      const data = await postApi.getGroupPosts(id);
      setPosts(data);
    } catch (error) {
      console.error(error);
      showToast('Error al cargar posts', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handlePickDocument = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: '*/*',
      copyToCacheDirectory: true,
      multiple: true,
    });
    if (!result.canceled && result.assets) {
      setFiles((prev) => [...prev, ...result.assets]);
    }
  };

  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.8,
      allowsMultipleSelection: true,
    });
    if (!result.canceled && result.assets) {
      setFiles((prev) => [...prev, ...result.assets]);
    }
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleCreatePost = async () => {
    if (!postTitle.trim() || !postContent.trim()) {
      showToast('Título y contenido son requeridos', 'error');
      return;
    }
    try {
      setIsPosting(true);
      
      const filesToUpload = files.map(f => ({
          uri: f.uri,
          type: f.mimeType || 'application/octet-stream',
          name: f.name || f.fileName || `file_${Date.now()}`
      }));

      await postApi.createPost(id, { title: postTitle, content: postContent, type: postType }, filesToUpload);
      showToast('Post publicado', 'success');
      setModalVisible(false);
      setPostTitle('');
      setPostContent('');
      setFiles([]);
      setPostType('GENERAL');
      loadPosts();
    } catch (error) {
      console.error(error);
      showToast('Error al publicar', 'error');
    } finally {
      setIsPosting(false);
    }
  };

  const togglePin = async (postId: string) => {
    try {
      await postApi.togglePin(id, postId);
      loadPosts();
    } catch (error) {
      showToast('Error al fijar post', 'error');
    }
  };
  
  const openFile = (url: string) => {
      Linking.openURL(authConfig.backendUrl.replace('/api', '') + url).catch(err => {
          showToast('No se pudo abrir el archivo', 'error');
      });
  };

  const handleDeleteResource = async (postId: string, resourceId: string) => {
      try {
          await postApi.deleteResource(id, postId, resourceId);
          setPosts(prev => prev.map(p => {
              if (p.id !== postId) return p;
              return { ...p, resources: (p as any).resources.filter((r: any) => r.id !== resourceId) };
          }));
          showToast('Recurso eliminado', 'success');
      } catch (error) {
          console.error(error);
          showToast('No se pudo eliminar el recurso', 'error');
      }
  };

  const handleDeletePost = async (postId: string) => {
      try {
          await postApi.deletePost(id, postId);
          setPosts(prev => prev.filter(p => p.id !== postId));
          showToast('Publicación eliminada', 'success');
      } catch (error) {
          console.error(error);
          showToast('No se pudo eliminar la publicación', 'error');
      }
  };

  const renderPost = ({ item }: { item: Post }) => (
    <View style={[styles.postCard, item.isPinned && styles.pinnedCard]}>
      <View style={styles.postHeader}>
         <View style={{flexDirection: 'row', alignItems: 'center'}}>
           {item.isPinned && <Ionicons name="pin" size={16} color={Colors.light.tint} style={{marginRight: 5}} />}
           <Text style={styles.postAuthor}>{item.author.name}</Text>
         </View>
         <Text style={styles.postDate}>{new Date(item.createdAt).toLocaleDateString()}</Text>
      </View>
      <View style={styles.typeBadge}>
        <Text style={styles.typeText}>{item.type}</Text>
      </View>
      {!!(item as any).title && (
          <Text style={styles.postTitle}>{(item as any).title}</Text>
      )}
      <Text style={styles.postContent}>{item.content}</Text>
      
      {(item as any).resources && (item as any).resources.length > 0 && (
          <View style={styles.filesContainer}>
             <Text style={{fontWeight: 'bold', marginBottom: 5, fontSize: 12}}>Archivos adjuntos:</Text>
             {(item as any).resources.map((res: any, i: number) => (
                 <View key={res.id || i} style={{flexDirection: 'row', alignItems: 'center', marginBottom: 5}}>
                     <Pressable onPress={() => openFile(res.url)} style={{flexDirection: 'row', alignItems: 'center', flex: 1}}>
                         <Ionicons name="document-attach" size={16} color={Colors.light.tint} />
                         <Text style={[styles.fileLink, {flex: 1}]} numberOfLines={1}>  {res.title}</Text>
                     </Pressable>
                     {(session?.user?.id === item.authorId || session?.user?.id === groupOwnerId) && (
                         <Pressable
                             onPress={() => handleDeleteResource(item.id, res.id)}
                             style={{marginLeft: 8, padding: 4}}
                         >
                             <Ionicons name="trash-outline" size={16} color="#ef4444" />
                         </Pressable>
                     )}
                 </View>
             ))}
          </View>
      )}

      {(session?.user?.id === item.authorId || session?.user?.id === groupOwnerId) && (
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', marginTop: 15, gap: 16 }}>
              {session?.user?.id === item.authorId && (
                  <Pressable onPress={() => togglePin(item.id)}>
                      <Text style={{ color: Colors.light.tint, fontSize: 12, fontWeight: 'bold' }}>
                          {item.isPinned ? 'Desfijar' : 'Fijar Post'}
                      </Text>
                  </Pressable>
              )}
              <Pressable onPress={() => handleDeletePost(item.id)} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Ionicons name="trash-outline" size={14} color="#ef4444" />
                  <Text style={{ color: '#ef4444', fontSize: 12, fontWeight: 'bold' }}>Eliminar</Text>
              </Pressable>
          </View>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: title || 'Muro del Grupo' }} />
      
      {loading ? (
        <ActivityIndicator style={{marginTop: 20}} color={Colors.light.tint} />
      ) : (
        <FlatList
          data={posts}
          keyExtractor={p => p.id}
          renderItem={renderPost}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={<Text style={styles.emptyText}>No hay publicaciones aún.</Text>}
        />
      )}

      <Pressable style={styles.fab} onPress={() => setModalVisible(true)}>
          <Ionicons name="add" size={28} color="#fff" />
      </Pressable>

      <Modal visible={isModalVisible} animationType="fade" transparent onRequestClose={() => setModalVisible(false)}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <View style={styles.modalOverlay}>
           <TouchableWithoutFeedback onPress={(e) => e.stopPropagation?.()}>
           <View style={styles.modalContent}>
               <ScrollView
                   keyboardShouldPersistTaps="handled"
                   showsVerticalScrollIndicator={false}
                   style={{ flexShrink: 1 }}
               >
                   <Text style={styles.modalTitle}>Nueva Publicación</Text>
                   <TextInput style={styles.input} placeholder="Título de la publicación (ej. Resumen de cálculo)" value={postTitle} onChangeText={setPostTitle} />
                   <TextInput style={[styles.input, {height: 80, textAlignVertical: 'top'}]} placeholder="Escribe el contenido..." multiline value={postContent} onChangeText={setPostContent} />
                   
                   <Text style={{fontSize: 12, marginBottom: 5, fontWeight: 'bold'}}>Etiqueta:</Text>
                   <View style={styles.typeSelector}>
                       {['GENERAL', 'PREGUNTA', 'MATERIAL', 'AVISO'].map(t => (
                           <Pressable key={t} onPress={() => setPostType(t)} style={[styles.typeButton, postType === t && styles.activeType]}>
                               <Text style={[styles.typeButtonText, postType === t && styles.activeTypeText]}>{t}</Text>
                           </Pressable>
                       ))}
                   </View>

                   <Text style={{fontSize: 12, marginTop: 10, marginBottom: 5, fontWeight: 'bold'}}>Adjuntos:</Text>
                   <View style={styles.actions}>
                       <Pressable onPress={handlePickDocument} style={styles.attachBtn}><Ionicons name="document-text" size={20} color="#555" /><Text> Documento</Text></Pressable>
                       <Pressable onPress={handlePickImage} style={styles.attachBtn}><Ionicons name="image" size={20} color="#555" /><Text> Foto</Text></Pressable>
                   </View>

                   {files.length > 0 && (
                       <View style={styles.fileList}>
                           {files.map((f, i) => (
                               <View key={i} style={styles.fileItem}>
                                   <Text numberOfLines={1} style={{flex: 1, fontSize: 12}}>{f.name || f.fileName || 'Archivo adjunto'}</Text>
                                   <Pressable onPress={() => removeFile(i)}><Ionicons name="close-circle" size={20} color="red" /></Pressable>
                               </View>
                           ))}
                       </View>
                   )}

                   <View style={styles.modalActions}>
                      <Pressable style={[styles.btn, {backgroundColor: '#e5e7eb'}]} onPress={() => { Keyboard.dismiss(); setModalVisible(false); }}><Text style={{color: '#374151', fontWeight: 'bold'}}>Cancelar</Text></Pressable>
                      <Pressable style={[styles.btn, {backgroundColor: Colors.light.tint, opacity: isPosting ? 0.5 : 1}]} onPress={handleCreatePost} disabled={isPosting}>
                          <Text style={{color: '#fff', fontWeight: 'bold'}}>{isPosting ? 'Publicando...' : 'Publicar'}</Text>
                      </Pressable>
                   </View>
               </ScrollView>
           </View>
           </TouchableWithoutFeedback>
        </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6' },
  listContainer: { padding: 16, paddingBottom: 80 },
  postCard: { backgroundColor: '#fff', padding: 15, borderRadius: 12, marginBottom: 15, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 1 },
  pinnedCard: { borderColor: Colors.light.tint, borderWidth: 1 },
  postHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  postAuthor: { fontWeight: 'bold', fontSize: 14, color: '#111827' },
  postDate: { fontSize: 12, color: '#6b7280' },
  typeBadge: { alignSelf: 'flex-start', backgroundColor: '#e5e7eb', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 16, marginBottom: 10 },
  typeText: { fontSize: 10, fontWeight: 'bold', color: '#4b5563' },
  postTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 6, color: '#1f2937' },
  postContent: { fontSize: 14, color: '#4b5563', marginBottom: 12, lineHeight: 20 },
  filesContainer: { marginTop: 10, backgroundColor: '#f9fafb', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#f3f4f6' },
  fileLink: { color: Colors.light.tint, fontSize: 13 },
  emptyText: { textAlign: 'center', marginTop: 50, color: '#6b7280', fontSize: 16 },
  fab: { position: 'absolute', right: 20, bottom: 20, backgroundColor: Colors.light.tint, width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 3.84 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: '#fff', borderRadius: 16, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4, elevation: 5 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 15, color: '#111827' },
  input: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, padding: 12, marginBottom: 12, fontSize: 14, backgroundColor: '#f9fafb' },
  typeSelector: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 15, gap: 8 },
  typeButton: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: '#f3f4f6', borderWidth: 1, borderColor: '#e5e7eb' },
  activeType: { backgroundColor: Colors.light.tint, borderColor: Colors.light.tint },
  typeButtonText: { fontSize: 12, color: '#4b5563', fontWeight: '500' },
  activeTypeText: { color: '#fff' },
  actions: { flexDirection: 'row', gap: 10, marginBottom: 15 },
  attachBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f3f4f6', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: '#e5e7eb' },
  fileList: { marginBottom: 15, backgroundColor: '#f9fafb', borderRadius: 8, padding: 10 },
  fileItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  modalActions: { flexDirection: 'row',justifyContent: 'flex-end', gap: 12, marginTop: 10 },
  btn: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 8 }
});
