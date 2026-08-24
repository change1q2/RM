const express = require('express');
const router = express.Router();
const XLSX = require('xlsx');
const { db, query, run, transaction } = require('../db');
const upload = require('../middleware/upload');

const FIELD_MAP = {
  '姓名': 'name', '名字': 'name',
  '电话': 'phone', '手机': 'phone', '手机号': 'phone',
  '微信': 'wechat', '微信号': 'wechat',
  '邮箱': 'email', '电子邮箱': 'email', '邮件': 'email',
  '生日': 'birthday', '出生日期': 'birthday',
  '城市': 'city', '所在城市': 'city',
  '公司': 'company', '单位': 'company', '所在公司': 'company',
  '职位': 'position', '职务': 'position', '头衔': 'position',
  '亲密度': 'intimacy',
  '资源描述': 'resource_desc', '资源': 'resource_desc',
  '需求描述': 'need_desc', '需求': 'need_desc',
  '备注': 'private_note', '私域备注': 'private_note', '忌口': 'private_note',
  '标签': 'tags'
};

router.get('/export', (req, res) => {
  const persons = query('SELECT * FROM persons ORDER BY id');
  const tagRows = query('SELECT pt.person_id, t.name FROM person_tags pt JOIN tags t ON t.id = pt.tag_id');
  const tagMap = {};
  for (const t of tagRows) {
    if (!tagMap[t.person_id]) tagMap[t.person_id] = [];
    tagMap[t.person_id].push(t.name);
  }
  const data = persons.map(p => ({
    '姓名': p.name || '', '电话': p.phone || '', '微信': p.wechat || '',
    '邮箱': p.email || '', '生日': p.birthday || '', '城市': p.city || '',
    '公司': p.company || '', '职位': p.position || '', '亲密度': p.intimacy || 3,
    '资源描述': p.resource_desc || '', '需求描述': p.need_desc || '',
    '备注': p.private_note || '', '标签': (tagMap[p.id] || []).join('、')
  }));
  const ws = XLSX.utils.json_to_sheet(data);
  ws['!cols'] = [{wch:12},{wch:14},{wch:14},{wch:20},{wch:12},{wch:10},{wch:20},{wch:16},{wch:8},{wch:30},{wch:30},{wch:30},{wch:20}];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '人脉档案');
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename=persons_export.xlsx');
  res.send(buf);
});

router.get('/template', (req, res) => {
  const sample = [{
    '姓名': '示例：张三', '电话': '13800138000', '微信': 'wx_zhangsan',
    '邮箱': 'zhangsan@example.com', '生日': '1985-06-15', '城市': '北京',
    '公司': '腾讯科技', '职位': '市场部经理', '亲密度': 3,
    '资源描述': '某品牌市场部负责人', '需求描述': '寻找品牌合作方',
    '备注': '忌口：不吃辣', '标签': '客户、朋友'
  }];
  const ws = XLSX.utils.json_to_sheet(sample);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '导入模板');
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename=import_template.xlsx');
  res.send(buf);
});

router.post('/import', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: '请上传 Excel/CSV 文件' });
  const filePath = req.file.path;
  let workbook;
  try {
    workbook = XLSX.readFile(filePath);
  } catch (e) {
    return res.status(400).json({ error: '文件解析失败：' + e.message });
  }
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
  if (rows.length === 0) {
    return res.status(400).json({ error: '文件无有效数据，请参照导入模板填写' });
  }

  let success = 0;
  let failed = 0;
  const errors = [];
  const allTags = query('SELECT id, name FROM tags');
  const tagNameMap = {};
  allTags.forEach(t => { tagNameMap[t.name] = t.id; });

  transaction(() => {
    const insertPerson = db.prepare('INSERT INTO persons (name, phone, wechat, email, birthday, city, company, position, intimacy, resource_desc, need_desc, private_note) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)');
    const insertTag = db.prepare('INSERT OR IGNORE INTO person_tags (person_id, tag_id) VALUES (?, ?)');
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const record = {};
      for (const cn in row) {
        const field = FIELD_MAP[cn];
        if (field) record[field] = String(row[cn] || '').trim();
      }
      if (!record.name) { failed++; errors.push('第' + (i + 2) + '行：缺少姓名'); continue; }
      try {
        const intimacy = record.intimacy ? Math.min(5, Math.max(1, parseInt(record.intimacy) || 3)) : 3;
        const r = insertPerson.run(record.name, record.phone || null, record.wechat || null, record.email || null, record.birthday || null, record.city || null, record.company || null, record.position || null, intimacy, record.resource_desc || null, record.need_desc || null, record.private_note || null);
        const pid = r.lastInsertRowid;
        if (record.tags) {
          const tagNames = record.tags.split(/[、,，;；]/).map(s => s.trim()).filter(Boolean);
          for (const tn of tagNames) {
            const tid = tagNameMap[tn];
            if (tid) insertTag.run(pid, tid);
          }
        }
        success++;
      } catch (e) { failed++; errors.push('第' + (i + 2) + '行：' + e.message); }
    }
  })();

  try { require('fs').unlinkSync(filePath); } catch (e) {}
  res.json({ success, failed, errors: errors.slice(0, 20), total: rows.length });
});

module.exports = router;
