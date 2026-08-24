const express = require('express');
const router = express.Router();
const { db, query, queryOne, run, transaction } = require('../db');

// 获取某人的互动记录列表（按日期倒序），含 todos
router.get('/person/:personId', (req, res) => {
  const pid = parseInt(req.params.personId);
  const person = queryOne('SELECT id FROM persons WHERE id = ?', [pid]);
  if (!person) return res.status(404).json({ error: '人物不存在' });

  const rows = query(
    'SELECT * FROM interactions WHERE person_id = ? ORDER BY interaction_date DESC, created_at DESC',
    [pid]
  );

  let todosMap = {};
  if (rows.length > 0) {
    const ids = rows.map(r => r.id);
    const ph = ids.map(() => '?').join(',');
    const todoRows = query(
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

// 新增互动记录（含 todos）
router.post('/', (req, res) => {
  const { person_id, interaction_date, method, content, todos } = req.body || {};
  if (!person_id || !interaction_date || !method) {
    return res.status(400).json({ error: '缺少必填字段: person_id, interaction_date, method' });
  }
  const person = queryOne('SELECT id FROM persons WHERE id = ?', [person_id]);
  if (!person) return res.status(404).json({ error: '人物不存在' });

  const result = transaction(() => {
    const r = run(
      'INSERT INTO interactions (person_id, interaction_date, method, content) VALUES (?, ?, ?, ?)',
      [person_id, interaction_date, method, content || null]
    );
    const interactionId = r.lastInsertRowid;

    if (Array.isArray(todos) && todos.length > 0) {
      const stmt = db.prepare('INSERT INTO interaction_todos (interaction_id, content) VALUES (?, ?)');
      for (const t of todos) {
        if (t && t.content) stmt.run(interactionId, t.content);
      }
    }

    // 同步更新 persons.last_interacted_at
    run('UPDATE persons SET last_interacted_at = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND (last_interacted_at IS NULL OR last_interacted_at < ?)', [interaction_date, person_id, interaction_date]);

    return interactionId;
  })();

  res.status(201).json({ id: result, message: '互动记录创建成功' });
});

// 编辑互动记录
router.put('/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const existing = queryOne('SELECT id FROM interactions WHERE id = ?', [id]);
  if (!existing) return res.status(404).json({ error: '互动记录不存在' });

  const { interaction_date, method, content, todos } = req.body || {};
  if (!interaction_date || !method) {
    return res.status(400).json({ error: '缺少必填字段: interaction_date, method' });
  }

  transaction(() => {
    run(
      'UPDATE interactions SET interaction_date = ?, method = ?, content = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [interaction_date, method, content || null, id]
    );

    // 全量替换 todos
    if (Array.isArray(todos)) {
      run('DELETE FROM interaction_todos WHERE interaction_id = ?', [id]);
      const stmt = db.prepare('INSERT INTO interaction_todos (interaction_id, content) VALUES (?, ?)');
      for (const t of todos) {
        if (t && t.content) stmt.run(id, t.content);
      }
    }
  })();

  res.json({ id, message: '互动记录更新成功' });
});

// 删除互动记录（todos 级联删除）
router.delete('/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const existing = queryOne('SELECT id FROM interactions WHERE id = ?', [id]);
  if (!existing) return res.status(404).json({ error: '互动记录不存在' });
  run('DELETE FROM interactions WHERE id = ?', [id]);
  res.json({ ok: true, message: '互动记录删除成功' });
});

// 切换 todo 完成状态
router.patch('/:id/todos/:todoId/toggle', (req, res) => {
  const todoId = parseInt(req.params.todoId);
  const todo = queryOne('SELECT id, is_completed FROM interaction_todos WHERE id = ?', [todoId]);
  if (!todo) return res.status(404).json({ error: '待办不存在' });

  const next = todo.is_completed ? 0 : 1;
  const completedAt = next ? new Date().toISOString() : null;
  run('UPDATE interaction_todos SET is_completed = ?, completed_at = ? WHERE id = ?', [next, completedAt, todoId]);
  res.json({ id: todoId, is_completed: !!next, completed_at: completedAt });
});

module.exports = router;
