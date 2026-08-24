const express = require('express');
const router = express.Router();
const path = require('path');
const { db, query, queryOne, run, transaction } = require('../db');
const upload = require('../middleware/upload');

router.get('/', (req, res) => {
  const { keyword, tags, tagLogic, intimacy, city, company, sortBy, sortOrder, page, pageSize } = req.query;
  const where = ['1=1'];
  const params = [];

  if (keyword) {
    where.push('(p.name LIKE ? OR p.company LIKE ? OR p.position LIKE ? OR p.resource_desc LIKE ? OR p.need_desc LIKE ?)');
    const kw = '%' + keyword + '%';
    params.push(kw, kw, kw, kw, kw);
  }
  if (city) { where.push('p.city LIKE ?'); params.push('%' + city + '%'); }
  if (company) { where.push('p.company LIKE ?'); params.push('%' + company + '%'); }
  if (intimacy) { where.push('p.intimacy >= ?'); params.push(parseInt(intimacy)); }

  if (tags) {
    const tagIds = String(tags).split(',').map(Number).filter(n => !isNaN(n) && n > 0);
    if (tagIds.length > 0) {
      const placeholders = tagIds.map(() => '?').join(',');
      if (tagLogic === 'and') {
        where.push('p.id IN (SELECT person_id FROM person_tags WHERE tag_id IN (' + placeholders + ') GROUP BY person_id HAVING COUNT(DISTINCT tag_id) = ?)');
        params.push(...tagIds, tagIds.length);
      } else {
        where.push('p.id IN (SELECT person_id FROM person_tags WHERE tag_id IN (' + placeholders + '))');
        params.push(...tagIds);
      }
    }
  }

  const whereClause = where.join(' AND ');
  const total = queryOne('SELECT COUNT(*) as total FROM persons p WHERE ' + whereClause, params).total;

  const p = Math.max(1, parseInt(page) || 1);
  const ps = Math.min(100, Math.max(1, parseInt(pageSize) || 20));
  const offset = (p - 1) * ps;

  const sortMap = { intimacy: 'p.intimacy', last_interacted_at: 'p.last_interacted_at', created_at: 'p.created_at' };
  const sortCol = sortMap[sortBy] || 'p.created_at';
  let orderClause;
  if (sortBy === 'last_interacted_at') {
    orderClause = sortOrder === 'asc'
      ? 'p.last_interacted_at IS NULL, p.last_interacted_at ASC'
      : 'p.last_interacted_at IS NULL, p.last_interacted_at DESC';
  } else {
    orderClause = sortCol + ' ' + (sortOrder === 'asc' ? 'ASC' : 'DESC');
  }

  const persons = query(
    'SELECT p.* FROM persons p WHERE ' + whereClause + ' ORDER BY ' + orderClause + ' LIMIT ? OFFSET ?',
    [...params, ps, offset]
  );

  let tagsMap = {};
  if (persons.length > 0) {
    const ids = persons.map(x => x.id);
    const ph = ids.map(() => '?').join(',');
    const tagRows = query(
      'SELECT pt.person_id, t.id as tag_id, t.name as tag_name, t.color as tag_color FROM person_tags pt JOIN tags t ON pt.tag_id = t.id WHERE pt.person_id IN (' + ph + ')',
      ids
    );
    for (const row of tagRows) {
      if (!tagsMap[row.person_id]) tagsMap[row.person_id] = [];
      tagsMap[row.person_id].push({ id: row.tag_id, name: row.tag_name, color: row.tag_color });
    }
  }

  const list = persons.map(x => ({ ...x, tags: tagsMap[x.id] || [] }));
  res.json({ total, page: p, pageSize: ps, list });
});

router.get('/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const person = queryOne('SELECT * FROM persons WHERE id = ?', [id]);
  if (!person) return res.status(404).json({ error: '人物不存在' });

  const tags = query(
    'SELECT t.id, t.name, t.color FROM person_tags pt JOIN tags t ON pt.tag_id = t.id WHERE pt.person_id = ?',
    [id]
  );
  const lastInteraction = queryOne(
    'SELECT interaction_date FROM interactions WHERE person_id = ? ORDER BY interaction_date DESC LIMIT 1',
    [id]
  );
  const interactionCount = queryOne('SELECT COUNT(*) as c FROM interactions WHERE person_id = ?', [id]).c;
  const relationshipCount = queryOne(
    'SELECT COUNT(*) as c FROM relationships WHERE person_a_id = ? OR person_b_id = ?',
    [id, id]
  ).c;

  res.json({
    ...person,
    tags,
    last_interaction_date: lastInteraction ? lastInteraction.interaction_date : null,
    stats: { interaction_count: interactionCount, relationship_count: relationshipCount }
  });
});

router.post('/', (req, res) => {
  const b = req.body || {};
  if (!b.name) return res.status(400).json({ error: '姓名为必填项' });

  const result = run(
    'INSERT INTO persons (name, phone, wechat, email, birthday, city, company, position, intimacy, resource_desc, need_desc, private_note) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)',
    [
      b.name,
      b.phone || null, b.wechat || null, b.email || null, b.birthday || null,
      b.city || null, b.company || null, b.position || null,
      b.intimacy != null ? b.intimacy : 3,
      b.resource_desc || null, b.need_desc || null, b.private_note || null
    ]
  );
  const personId = result.lastInsertRowid;

  if (Array.isArray(b.tags) && b.tags.length > 0) {
    const insertTag = db.prepare('INSERT OR IGNORE INTO person_tags (person_id, tag_id) VALUES (?, ?)');
    const insertTags = db.transaction((tags) => {
      for (const tid of tags) insertTag.run(personId, tid);
    });
    insertTags(b.tags);
  }

  res.status(201).json({ id: personId, message: '创建成功' });
});

router.put('/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const existing = queryOne('SELECT id FROM persons WHERE id = ?', [id]);
  if (!existing) return res.status(404).json({ error: '人物不存在' });

  const b = req.body || {};
  if (!b.name) return res.status(400).json({ error: '姓名为必填项' });

  run(
    'UPDATE persons SET name=?, phone=?, wechat=?, email=?, birthday=?, city=?, company=?, position=?, intimacy=?, resource_desc=?, need_desc=?, private_note=?, updated_at=CURRENT_TIMESTAMP WHERE id=?',
    [
      b.name,
      b.phone || null, b.wechat || null, b.email || null, b.birthday || null,
      b.city || null, b.company || null, b.position || null,
      b.intimacy != null ? b.intimacy : 3,
      b.resource_desc || null, b.need_desc || null, b.private_note || null,
      id
    ]
  );

  if (Array.isArray(b.tags)) {
    run('DELETE FROM person_tags WHERE person_id = ?', [id]);
    const insertTag = db.prepare('INSERT OR IGNORE INTO person_tags (person_id, tag_id) VALUES (?, ?)');
    const insertTags = db.transaction((tags) => {
      for (const tid of tags) insertTag.run(id, tid);
    });
    insertTags(b.tags);
  }

  res.json({ id, message: '更新成功' });
});

router.delete('/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const existing = queryOne('SELECT id FROM persons WHERE id = ?', [id]);
  if (!existing) return res.status(404).json({ error: '人物不存在' });
  run('DELETE FROM persons WHERE id = ?', [id]);
  res.json({ ok: true, message: '删除成功' });
});

router.post('/:id/avatar', upload.single('avatar'), (req, res) => {
  const id = parseInt(req.params.id);
  const existing = queryOne('SELECT id FROM persons WHERE id = ?', [id]);
  if (!existing) return res.status(404).json({ error: '人物不存在' });
  if (!req.file) return res.status(400).json({ error: '请上传头像图片' });
  const avatarUrl = '/uploads/avatars/' + req.file.filename;
  run('UPDATE persons SET avatar_url = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [avatarUrl, id]);
  res.json({ avatar_url: avatarUrl });
});

module.exports = router;
