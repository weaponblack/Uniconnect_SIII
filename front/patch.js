const fs = require('fs');
const file = 'c:/Users/Nicol/OneDrive/Documentos/Soft3/uniconnect-g5/front/app/study-groups.tsx';
let data = fs.readFileSync(file, 'utf-8');
const oldCode = `                            ) : (
                                <Pressable
                                    style={styles.manageButton}
                                    onPress={() => {
                                        setEditingGroup(group);
                                        setEditInfoName(group.name);
                                        setEditInfoDesc(group.description || '');
                                    }}
                                >
                                    <Text style={styles.manageButtonText}>{isOwner ? 'Gestionar' : 'Ver grupo'}</Text>
                                </Pressable>
                            )}`;
const newCode = `                            ) : (
                                <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
                                    <Pressable
                                        style={[styles.manageButton, { flex: 1 }]}
                                        onPress={() => {
                                            setEditingGroup(group);
                                            setEditInfoName(group.name);
                                            setEditInfoDesc(group.description || '');
                                        }}
                                    >
                                        <Text style={styles.manageButtonText}>{isOwner ? 'Gestionar' : 'Info'}</Text>
                                    </Pressable>
                                    <Pressable
                                        style={[styles.manageButton, { flex: 1, backgroundColor: Colors.light.tint }]}
                                        onPress={() => router.push(\`/study-group/\${group.id}?title=\${encodeURIComponent(group.name)}\`)}
                                    >
                                        <Text style={[styles.manageButtonText, { color: '#fff' }]}>Ver Muro</Text>
                                    </Pressable>
                                </View>
                            )}`;
data = data.replace(oldCode, newCode);
fs.writeFileSync(file, data);
