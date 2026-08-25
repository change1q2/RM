const express = require('express');
const router = express.Router();
const { query, queryOne, run, transaction } = require('../db');
const { authMiddleware } = require('../middleware/auth');

// 所有路由都需要认证
router.use(authMiddleware);

router.get('/person/:personId', async (req, res) => {
  const pid = parseInt(req.params.personId);
  const person = await queryOne('SELECT id FROM persons WHERE id = ? AND user_id = ?', [pid, req.user.id]);
  if (!person) return res.status(404).json({ error: '人物不存在' });

  const rows = await query(
    'SELECT * FROM interactions WHERE person_id = ? AND user_id = ? ORDER BY interaction_date DESC, created_at DESC',
    [pid, req.user.id]
  );

  let todosMap = {};
  if (rows.length > 0) {
    const ids = rows.map(r => r.id);
    const ph = ids.map(() => '?').join(',');
    const todoRows = await query(
      'SELECT * FROM interaction_todos WHERE interaction_id IN (' + ph + ') ORDER BY created_at ASC',
      ids
    );
    for (const t of todoRows) {
      if (!todosMap[t.interaction_id]) todosMap[t.interaction_id] = [];
      todosMap[t.interaction_id].push({
        id: t.id,
        content: t.content,
        is_completed: !!t.is_completed,
        completed_at: t.completed_at,
        created_at: t.created_at
      });
    }
  }

  const list = rows.map(r => ({
    id: r.id,
    person_id: r.person_id,
    interaction_date: r.interaction_date,
    method: r.method,
    content: r.content,
    created_at: r.created_at,
    updated_at: r.updated_at,
    todos: todosMap[r.id] || []
  }));

  res.json(list);
});

router.post('/', async (req, res) => {
  const { person_id, interaction_date, method, content, todos } = req.body || {};
  if (!person_id || !interaction_date || !method) {
    return res.status(400).json({ error: '缺少必填字段: person_id, interaction_date, method' });
  }
  const person = await queryOne('SELECT id FROM persons WHERE id = ? AND user_id = ?', [person_id, req.user.id]);
  if (!person) return res.status(404).json({ error: '人物不存在' });

  const result = await transaction(async () => {
    const r = await run(
      'INSERT INTO interactions (user_id, person_id, interaction_date, method, content) VALUES (?, ?, ?, ?, ?)',
      [req.user.id, person_id, interaction_date, method, content || null]
    );
    const interactionId = r.lastInsertRowid;

    if (Array.isArray(todos) && todos.length > 0) {
      for (const t of todos) {
        if (t && t.content) {
          await run('INSERT INTO interaction_todos (interaction_id, content) VALUES (?, ?)', [interactionId, t.content]);
        }
      }
    }

    await run(
      'UPDATE persons SET last_interacted_at = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ? AND (last_interacted_at IS NULL OR last_interacted_at < ?)',
      [interaction_date, person_id, req.user.id, interaction_date]
    );

    return interactionId;
  })();

  res.status(201).json({ id: result, message: '互动记录创建成功' });
});

router.put('/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  const existing = await queryOne('SELECT id FROM interactions WHERE id = ? AND user_id = ?', [id, req.user.id]);
  if (!existing) return res.status(404).json({ error: '互动记录不存在' });

  const { interaction_date, method, content, todos } = req.body || {};
  if (!interaction_date || !method) {
    return res.status(400).json({ error: '缺少必填字段: interaction_date, method' });
  }

  await transaction(async () => {
    await run(
      'UPDATE interactions SET interaction_date = ?, method = ?, content = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?',
      [interaction_date, method, content || null, id, req.user.id]
    );

    if (Array.isArray(todos)) {
      await run('DELETE FROM interaction_todos WHERE interaction_id = ?', [id]);
      for (const t of todos) {
        if (t && t.content) {
          await run('INSERT INTO interaction_todos (interaction_id, content) VALUES (?, ?)', [id, t.content]);
        }
      }
    }
  })();

  res.json({ id, message: '互动记录更新成功' });
});

router.delete('/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  const existing = await queryOne('SELECT id FROM interactions WHERE id = ? AND user_id = ?', [id, req.user.id]);
  if (!existing) return res.status(404).json({ error: '互动记录不存在' });
  await run('DELETE FROM interactions WHERE id = ? AND user_id = ?', [id, req.user.id]);
  res.json({ ok: true, message: '互动记录删除成功' });
});

router.patch('/:id/todos/:todoId/toggle', async (req, res) => {
  const todoId = parseInt(req.params.todoId);
  const todo = await queryOne(
    'SELECT t.id, t.is_completed FROM interaction_todos t JOIN interactions i ON i.id = t.interaction_id WHERE t.id = ? AND i.user_id = ?',
    [todoId, req.user.id]
  );
  if (!todo) return res.status(404).json({ error: '待办不存在' });

  const next = todo.is_completed ? 0 : 1;
  const completedAt = next ? new Date().toISOString() : null;
  await run('UPDATE interaction_todos SET is_completed = ?, completed_at = ? WHERE id = ?', [next, completedAt, todoId]);
  res.json({ id: todoId, is_completed: !!next, completed_at: completedAt });
});

module.exports = router;
