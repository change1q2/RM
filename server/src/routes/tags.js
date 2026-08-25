const express = require('express');
const router = express.Router();
const { query, queryOne, run } = require('../db');

router.get('/', async (req, res) => {
  const tags = await query('SELECT * FROM tags ORDER BY sort_order, id');
  res.json(tags);
});

router.post('/', async (req, res) => {
  const { name, color } = req.body || {};
  if (!name) return res.status(400).json({ error: '标签名不能为空' });
  if (!color) return res.status(400).json({ error: '标签颜色不能为空' });
  const existing = await queryOne('SELECT id FROM tags WHERE name = ?', [String(name)]);
  if (existing) return res.status(400).json({ error: '标签名已存在' });
  const result = await run('INSERT INTO tags (name, color) VALUES (?, ?)', [String(name), String(color)]);
  res.status(201).json({ id: result.lastInsertRowid, name, color });
});

router.put('/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  const existing = await queryOne('SELECT id FROM tags WHERE id = ?', [id]);
  if (!existing) return res.status(404).json({ error: '标签不存在' });
  const { name, color, sort_order } = req.body || {};
  if (name) {
    const dup = await queryOne('SELECT id FROM tags WHERE name = ? AND id != ?', [String(name), id]);
    if (dup) return res.status(400).json({ error: '标签名已存在' });
  }
  await run('UPDATE tags SET name = COALESCE(?, name), color = COALESCE(?, color), sort_order = COALESCE(?, sort_order) WHERE id = ?',
    [name || null, color || null, sort_order != null ? sort_order : null, id]);
  res.json({ id, message: '更新成功' });
});

router.delete('/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  const existing = await queryOne('SELECT id FROM tags WHERE id = ?', [id]);
  if (!existing) return res.status(404).json({ error: '标签不存在' });
  await run('DELETE FROM tags WHERE id = ?', [id]);
  res.json({ ok: true, message: '删除成功' });
});

module.exports = router;
