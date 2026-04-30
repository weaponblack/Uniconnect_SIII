import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, Pressable, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { chatApi, type ChatMessage } from '@/lib/chat-api';
import { loadSession, type SessionData } from '@/lib/session';
import { useNotifications } from '@/context/NotificationContext';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import * as DocumentPicker from 'expo-document-picker';
import { decorateMessage } from '@/lib/message-decorator';

export default function PrivateChat() {
  const { id, name } = useLocalSearchParams<{ id: string, name?: string }>();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [session, setSession] = useState<SessionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [file, setFile] = useState<any>(null);
  const flatListRef = useRef<FlatList>(null);
  
  const { socket } = useNotifications();

  useEffect(() => {
    loadSession().then(setSession);
    fetchHistory();
  }, [id]);

  const fetchHistory = async () => {
    try {
      const data = await chatApi.getPrivateHistory(id);
      setMessages(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!socket || !session) return;

    const onMessage = (msg: ChatMessage) => {
      // Check if message belongs to this conversation
      if ((msg.senderId === id && msg.receiverId === session.user.id) || 
          (msg.senderId === session.user.id && msg.receiverId === id)) {
        setMessages((prev) => {
          if (prev.find(m => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
      }
    };

    socket.on('private-message', onMessage);

    return () => {
      socket.off('private-message', onMessage);
    };
  }, [socket, id, session]);

  const handleSend = async () => {
    if (!inputText.trim() && !file) return;

    try {
      let fileToUpload = null;
      if (file) {
        fileToUpload = {
          uri: file.uri,
          type: file.mimeType || 'application/octet-stream',
          name: file.name || `file_${Date.now()}`
        };
      }

      await chatApi.sendPrivateMessage(id, inputText.trim(), fileToUpload);
      setInputText('');
      setFile(null);
    } catch (e) {
      console.error(e);
    }
  };

  const pickDocument = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
    if (!result.canceled && result.assets) {
      setFile(result.assets[0]);
    }
  };

  const renderItem = ({ item }: { item: ChatMessage }) => {
    const isMe = item.senderId === session?.user.id;
    const firstName = session?.user.name?.split(' ')[0];
    const isMentioned = !!firstName && item.content.includes(`@${firstName}`);

    return (
      <View style={[styles.messageWrapper, isMe ? styles.messageWrapperMe : styles.messageWrapperOther]}>
        <View style={[styles.messageBubble, isMe ? styles.messageBubbleMe : styles.messageBubbleOther]}>
          {decorateMessage(item.content, item.fileUrl, item.fileName, item.fileType, isMentioned)}
        </View>
        <Text style={styles.timeText}>
          {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>
    );
  };

  if (loading) return <ActivityIndicator style={{ flex: 1 }} color={Colors.light.tint} />;

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Stack.Screen options={{ title: name ? `${name}` : 'Chat Privado' }} />
      
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
      />

      {file && (
        <View style={styles.attachmentPreview}>
          <Text style={{ flex: 1 }} numberOfLines={1}>{file.name}</Text>
          <Pressable onPress={() => setFile(null)}>
            <Ionicons name="close-circle" size={24} color="red" />
          </Pressable>
        </View>
      )}

      <View style={styles.inputContainer}>
        <Pressable style={styles.attachBtn} onPress={pickDocument}>
          <Ionicons name="attach" size={28} color={Colors.light.tint} />
        </Pressable>
        <TextInput
          style={styles.input}
          placeholder="Escribe un mensaje..."
          value={inputText}
          onChangeText={setInputText}
          multiline
        />
        <Pressable style={styles.sendBtn} onPress={handleSend}>
          <Ionicons name="send" size={24} color="#fff" />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6' },
  listContent: { padding: 15, paddingBottom: 20 },
  messageWrapper: { marginBottom: 15, maxWidth: '85%' },
  messageWrapperMe: { alignSelf: 'flex-end' },
  messageWrapperOther: { alignSelf: 'flex-start' },
  messageBubble: { padding: 12, borderRadius: 16 },
  messageBubbleMe: { backgroundColor: '#dbeafe', borderBottomRightRadius: 0 },
  messageBubbleOther: { backgroundColor: '#fff', borderBottomLeftRadius: 0, borderWidth: 1, borderColor: '#e5e7eb' },
  timeText: { fontSize: 10, color: '#9ca3af', alignSelf: 'flex-end', marginTop: 4 },
  attachmentPreview: { flexDirection: 'row', backgroundColor: '#e5e7eb', padding: 10, marginHorizontal: 15, borderRadius: 8, alignItems: 'center' },
  inputContainer: { flexDirection: 'row', padding: 10, backgroundColor: '#fff', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#e5e7eb' },
  attachBtn: { padding: 5, marginRight: 5 },
  input: { flex: 1, backgroundColor: '#f3f4f6', borderRadius: 20, paddingHorizontal: 15, paddingVertical: 10, maxHeight: 100 },
  sendBtn: { backgroundColor: Colors.light.tint, width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginLeft: 10 },
});
