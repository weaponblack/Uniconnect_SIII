import fs from 'fs';
const file = 'c:/Users/Nicol/OneDrive/Documentos/Soft3/uniconnect-g5/backend/src/modules/post/post.controller.ts';
let code = fs.readFileSync(file, 'utf-8');

code = code.replace(
`    const newPost = await createPost(groupId, authorId, data, files);`,
`    const newPost = await createPost(groupId, authorId, data, files, req.user);`
);

code = code.replace(
`    const posts = await getGroupPosts(groupId, userId);`,
`    const posts = await getGroupPosts(groupId, userId, req.user);`
);

code = code.replace(
`    const updatedPost = await togglePinPost(groupId, postId, userId);`,
`    const updatedPost = await togglePinPost(groupId, postId, userId, req.user);`
);

code = code.replace(
`    await deletePost(groupId, postId, userId);`,
`    await deletePost(groupId, postId, userId, req.user);`
);

code = code.replace(
`    const newComment = await addComment(groupId, postId, authorId, data.content);`,
`    const newComment = await addComment(groupId, postId, authorId, data.content, req.user);`
);

fs.writeFileSync(file, code);
