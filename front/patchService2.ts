const fs = require('fs');
const file = 'c:/Users/Nicol/OneDrive/Documentos/Soft3/uniconnect-g5/backend/src/modules/post/post.service.ts';
let code = fs.readFileSync(file, 'utf-8');

code = code.replace(
`export async function createPost(groupId: string, authorId: string, data: any, files: Express.Multer.File[] = []) {`,
`export async function createPost(groupId: string, authorId: string, data: any, files: Express.Multer.File[] = [], payload?: any) {`
);
code = code.replace(
`    const { group, isOwner } = await checkMembership(groupId, authorId);`,
`    const { group, isOwner, actualUserId } = await checkMembership(groupId, authorId, payload);
    authorId = actualUserId;`
);
code = code.replace(
`    return { group, isOwner };`,
`    return { group, isOwner, actualUserId: userId };`
);

code = code.replace(
`export async function getGroupPosts(groupId: string, userId: string) {`,
`export async function getGroupPosts(groupId: string, userId: string, payload?: any) {`
);
code = code.replace(
`    await checkMembership(groupId, userId);`,
`    await checkMembership(groupId, userId, payload);`
);

code = code.replace(
`export async function togglePinPost(groupId: string, postId: string, userId: string) {`,
`export async function togglePinPost(groupId: string, postId: string, userId: string, payload?: any) {`
);
code = code.replace(
`    const { isOwner } = await checkMembership(groupId, userId);`,
`    const { isOwner } = await checkMembership(groupId, userId, payload);`
);

code = code.replace(
`export async function deletePost(groupId: string, postId: string, userId: string) {`,
`export async function deletePost(groupId: string, postId: string, userId: string, payload?: any) {`
);
code = code.replace(
`    const { isOwner } = await checkMembership(groupId, userId);`,
`    const { isOwner, actualUserId } = await checkMembership(groupId, userId, payload);
    userId = actualUserId;`
);

code = code.replace(
`export async function addComment(groupId: string, postId: string, authorId: string, content: string) {`,
`export async function addComment(groupId: string, postId: string, authorId: string, content: string, payload?: any) {`
);
code = code.replace(
`    await checkMembership(groupId, authorId);`,
`    const { actualUserId } = await checkMembership(groupId, authorId, payload);
    authorId = actualUserId;`
);

fs.writeFileSync(file, code);
