const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();

const PORT = 3001;


const ADMIN_TOKEN = 'super-secret-token-2';


const COMMENTS_FILE = path.join(__dirname, 'comments2.txt');


let comments = [];
let nextId = 1;

app.use(express.json());


app.use(express.static(path.join(__dirname, 'public')));


app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});


function normalizeName(name) {
    return (name || '').trim().toLowerCase();
}


function saveCommentsToFile() {
    const lines = comments.map(c => {
        const safeText = (c.text || '').replace(/\r?\n/g, ' ');
        return `id=${c.id}; author=${c.author}; hidden=${c.hidden}; createdAt=${c.createdAt}; text=${safeText}`;
    });

    fs.writeFile(COMMENTS_FILE, lines.join('\n'), (err) => {
        if (err) {
            console.error('Ошибка при записи файла comments2.txt:', err);
        } else {
            console.log('Комментарии второго пользователя сохранены в comments2.txt');
        }
    });
}


app.get('/api/comments', (req, res) => {
    const isAdmin = req.query.adminToken === ADMIN_TOKEN;

    const result = isAdmin
        ? comments
        : comments.filter(c => !c.hidden);

    res.json(result);
});


app.post('/api/comments', (req, res) => {
    const { author, text } = req.body;

    if (!author || !text || !author.trim() || !text.trim()) {
        return res.status(400).json({ error: 'Автор и текст комментария обязательны' });
    }

    const newComment = {
        id: nextId++,
        author: author.trim(),
        text: text.trim(),
        createdAt: new Date().toISOString(),
        hidden: false
    };

    comments.push(newComment);
    saveCommentsToFile();

    res.status(201).json(newComment);
});


app.put('/api/comments/:id', (req, res) => {
    const id = Number(req.params.id);
    const { text, requester, adminToken } = req.body;

    const comment = comments.find(c => c.id === id);
    if (!comment) {
        return res.status(404).json({ error: 'Комментарий не найден' });
    }

    if (!text || !text.trim()) {
        return res.status(400).json({ error: 'Текст комментария обязателен' });
    }

    const isAdmin = adminToken === ADMIN_TOKEN;
    const isOwner = normalizeName(requester) === normalizeName(comment.author);

    if (!isAdmin && !isOwner) {
        return res.status(403).json({ error: 'Вы можете изменять только свои комментарии' });
    }

    comment.text = text.trim();
    saveCommentsToFile();

    res.json(comment);
});


app.patch('/api/comments/:id/hide', (req, res) => {
    const id = Number(req.params.id);
    const { hide, adminToken } = req.body;

    if (adminToken !== ADMIN_TOKEN) {
        return res.status(403).json({ error: 'Только автор может скрывать комментарии' });
    }

    const comment = comments.find(c => c.id === id);
    if (!comment) {
        return res.status(404).json({ error: 'Комментарий не найден' });
    }

    comment.hidden = !!hide;
    saveCommentsToFile();

    res.json(comment);
});


app.delete('/api/comments/:id', (req, res) => {
    const id = Number(req.params.id);
    const { requester, adminToken } = req.body;

    const index = comments.findIndex(c => c.id === id);
    if (index === -1) {
        return res.status(404).json({ error: 'Комментарий не найден' });
    }

    const comment = comments[index];

    const isAdmin = adminToken === ADMIN_TOKEN;
    const isOwner = normalizeName(requester) === normalizeName(comment.author);

    if (!isAdmin && !isOwner) {
        return res.status(403).json({ error: 'Вы можете удалять только свои комментарии' });
    }

    comments.splice(index, 1);
    saveCommentsToFile();

    res.json({ success: true });
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
    console.log(`Комментарии второго пользователя будут сохраняться в файл: ${COMMENTS_FILE}`);
});
