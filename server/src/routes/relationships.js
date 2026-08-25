const express = require('express');
const router = express.Router();
const { query, queryOne, run } = require('../db');
const { authMiddleware } = require('../middleware/auth');

// 所有路由都需要认证
router.use(authMiddleware);

router.post('/', async (req, res) => {
  const { person_a_id, person_b_id, relation_type, strength, introduced_by } = req.body || {};
  if (!person_a_id || !person_b_id || !relation_type) {
    return res.status(400).json({ error: '缺少必填字段: person_a_id, person_b_id, relation_type' });
  }
  if (person_a_id === person_b_id) {
    return res.status(400).json({ error: '不能与自己建立关系' });
  }
  // 确保两个人物都属于当前用户
  const a = await queryOne('SELECT id FROM persons WHERE id = ? AND user_id = ?', [person_a_id, req.user.id]);
  const b = await queryOne('SELECT id FROM persons WHERE id = ? AND user_id = ?', [person_b_id, req.user.id]);
  if (!a || !b) return res.status(404).json({ error: '关联人物不存在' });

  const existing = await queryOne(
    'SELECT id FROM relationships WHERE person_a_id = ? AND person_b_id = ? AND relation_type = ? AND user_id = ?',
    [person_a_id, person_b_id, relation_type, req.user.id]
  );
  if (existing) return res.status(400).json({ error: '该关系已存在' });

  const result = await run(
    'INSERT INTO relationships (user_id, person_a_id, person_b_id, relation_type, strength, introduced_by) VALUES (?, ?, ?, ?, ?, ?)',
    [req.user.id, person_a_id, person_b_id, relation_type, strength || 3, introduced_by || null]
  );
  res.status(201).json({ id: result.lastInsertRowid, message: '关系创建成功' });
});

router.delete('/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  const existing = await queryOne('SELECT id FROM relationships WHERE id = ? AND user_id = ?', [id, req.user.id]);
  if (!existing) return res.status(404).json({ error: '关系不存在' });
  await run('DELETE FROM relationships WHERE id = ? AND user_id = ?', [id, req.user.id]);
  res.json({ ok: true, message: '关系删除成功' });
});

router.get('/person/:personId', async (req, res) => {
  const pid = parseInt(req.params.personId);
  // 确保人物属于当前用户
  const person = await queryOne('SELECT id FROM persons WHERE id = ? AND user_id = ?', [pid, req.user.id]);
  if (!person) return res.status(404).json({ error: '人物不存在' });

  const rels = await query(
    `SELECT r.*, 
       CASE WHEN r.person_a_id = ? THEN r.person_b_id ELSE r.person_a_id END AS other_id,
       p.name AS other_name, p.company AS other_company, p.position AS other_position,
       p.intimacy AS other_intimacy, p.avatar_url AS other_avatar,
       intro.name AS introducer_name
     FROM relationships r
     JOIN persons p ON p.id = CASE WHEN r.person_a_id = ? THEN r.person_b_id ELSE r.person_a_id END
     LEFT JOIN persons intro ON intro.id = r.introduced_by
     WHERE (r.person_a_id = ? OR r.person_b_id = ?) AND r.user_id = ?
     ORDER BY r.strength DESC, r.created_at DESC`,
    [pid, pid, pid, pid, req.user.id]
  );
  res.json(rels);
});

module.exports = router;
