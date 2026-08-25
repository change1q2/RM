const dayjs = require('dayjs');
const { query, queryOne, run, transaction } = require('./index');

const SURNAMES = ['张','王','李','赵','陈','刘','杨','黄','周','吴','徐','孙','马','朱','胡','郭','何','林','高','罗'];
const GIVEN_NAMES = ['伟','芳','娜','敏','静','丽','强','磊','军','洋','艳','勇','涛','明','超','平','辉','霞','鹏','华','秀英','桂英','玉兰','建国','建华','志强','丽娟','晓燕','晓明','雪梅','文博','思远','梓涵','雨萱','浩然','子轩','一诺','梓轩','欣怡','诗涵'];
const CITIES = ['北京','上海','广州','深圳','杭州','成都','南京','武汉','西安','苏州','重庆','天津','长沙','青岛','厦门'];
const COMPANIES = ['腾讯科技','阿里巴巴','字节跳动','百度集团','美团点评','京东集团','小米科技','华为技术','网易公司','滴滴出行','快手科技','哔哩哔哩','爱奇艺','携程集团','五粮液集团','茅台集团','中央电视台','人民日报社','中国石化','国家电网','某广告公司','某品牌咨询公司','某投资机构','某文化传媒公司','某互联网创业公司'];
const POSITIONS = ['市场部经理','品牌总监','广告公司老板','央视制片人','投资合伙人','产品经理','运营总监','销售总监','人力资源总监','财务总监','CTO','CEO','设计师','工程师','策划经理','公关总监','内容运营','客户经理','渠道经理','法务总监','采购经理','行政总监','副总裁','创始人','联合创始人'];
const RELATION_TYPES = ['同学','同事','朋友','合作伙伴','引荐','客户','夫妻','亲属','其他'];
const INTERACTION_METHODS = ['微信','电话','面谈','饭局','活动','其他'];
const RESOURCE_SAMPLES = [
  '某白酒品牌市场部负责人，有央视投放预算',
  '互联网大厂产品总监，有技术团队资源',
  '投资机构合伙人，手握早期项目投资额度',
  '央视栏目制片人，可对接广告和节目资源',
  '4A广告公司创意总监，有品牌全案经验',
  '上市公司董秘，对接资本市场资源',
  '连锁餐饮集团创始人，有门店扩张需求',
  '美妆品牌创始人，有抖音投放渠道',
  '地产集团营销总，有楼盘推广预算',
  '某行业协会秘书长，有企业资源网络',
  '高校教授，产学研合作资源丰富',
  '政府招商局负责人，有产业政策资源',
  '跨境电商大卖，有海外渠道资源',
  '影视公司出品人，有明星代言资源',
  '律所高级合伙人，企业法务资源丰富'
];
const NEED_SAMPLES = [
  '找靠谱品牌合作方',
  '需要寻找优质供应商',
  '寻求渠道拓展合作机会',
  '需要融资对接投资人',
  '寻找新媒体推广渠道',
  '需要猎头推荐高端人才',
  '寻求政府项目申报指导',
  '需要法律顾问服务',
  '寻找产品分销代理',
  '需要品牌升级咨询',
  '寻求异业合作机会',
  '需要技术外包团队',
  '寻找明星代言资源',
  '需要线下活动场地',
  '寻求媒体曝光机会'
];

function random(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateName() {
  const surname = random(SURNAMES);
  const given = random(GIVEN_NAMES);
  return surname + given;
}

function generatePhone() {
  const prefix = ['138','139','186','188','158','159','136','137','189','150'];
  return random(prefix) + String(randomInt(10000000, 99999999));
}

function generateEmail(name) {
  const domains = ['qq.com','163.com','gmail.com','outlook.com','sina.com','foxmail.com'];
  const pinyinMap = { '张':'zhang','王':'wang','李':'li','赵':'zhao','陈':'chen','刘':'liu','杨':'yang','黄':'huang','周':'zhou','吴':'wu','徐':'xu','孙':'sun','马':'ma','朱':'zhu','胡':'hu','郭':'guo','何':'he','林':'lin','高':'gao','罗':'luo' };
  const first = name.charAt(0);
  const py = pinyinMap[first] || 'user';
  return py + randomInt(100, 9999) + '@' + random(domains);
}

(async () => {
  console.log('=== 开始生成种子数据 ===\n');

  await transaction(async () => {
    await run('DELETE FROM interaction_todos');
    await run('DELETE FROM interactions');
    await run('DELETE FROM person_tags');
    await run('DELETE FROM relationships');
    await run('DELETE FROM persons');
  })();
  console.log('[清理] 旧数据已删除');

  const persons = [];
  const today = dayjs();

  for (let i = 0; i < 35; i++) {
    const name = generateName();
    let birthday = null;
    let lastInteracted = null;

    if (i < 5) {
      const offset = randomInt(1, 28);
      birthday = today.add(offset, 'day').format('YYYY-MM-DD');
    } else if (i < 10) {
      const historicalDates = ['1985-01-15','1988-06-22','1990-09-08','1992-03-14','1987-11-30'];
      birthday = historicalDates[i - 5];
    }

    if (i < 5) {
      lastInteracted = today.subtract(randomInt(185, 400), 'day').format('YYYY-MM-DD HH:mm:ss');
    } else {
      const recent = randomInt(0, 120);
      lastInteracted = today.subtract(recent, 'day').format('YYYY-MM-DD HH:mm:ss');
    }

    const result = await run(
      'INSERT INTO persons (name, phone, wechat, email, birthday, city, company, position, intimacy, resource_desc, need_desc, avatar_url, last_interacted_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        name,
        Math.random() > 0.15 ? generatePhone() : null,
        Math.random() > 0.2 ? 'wx_' + name.replace(/[^\u4e00-\u9fa5]/g,'') + randomInt(10,999) : null,
        Math.random() > 0.25 ? generateEmail(name) : null,
        birthday,
        random(CITIES),
        random(COMPANIES),
        random(POSITIONS),
        randomInt(1, 5),
        random(RESOURCE_SAMPLES),
        random(NEED_SAMPLES),
        '',
        lastInteracted
      ]
    );
    persons.push({ id: result.lastInsertRowid, name });
  }
  console.log('[persons] 插入 ' + persons.length + ' 条数据');

  const tags = await query('SELECT id, name FROM tags ORDER BY sort_order');
  let tagRelationCount = 0;
  for (let i = 0; i < persons.length; i++) {
    const tagCount = randomInt(1, 4);
    const usedTags = new Set();
    for (let j = 0; j < tagCount; j++) {
      const tag = random(tags);
      if (!usedTags.has(tag.id)) {
        usedTags.add(tag.id);
        await run('INSERT OR IGNORE INTO person_tags (person_id, tag_id) VALUES (?, ?)', [persons[i].id, tag.id]);
        tagRelationCount++;
      }
    }
  }
  console.log('[person_tags] 插入 ' + tagRelationCount + ' 条关联');

  let relationshipCount = 0;
  const addedRelations = new Set();

  async function addRelation(aIdx, bIdx, type, strength, introducedBy = null) {
    const a = persons[aIdx];
    const b = persons[bIdx];
    if (a.id === b.id) return;
    const key = [Math.min(a.id,b.id), Math.max(a.id,b.id), type].join('-');
    if (addedRelations.has(key)) return;
    addedRelations.add(key);
    await run('INSERT OR IGNORE INTO relationships (person_a_id, person_b_id, relation_type, strength, introduced_by) VALUES (?, ?, ?, ?, ?)',
      [a.id, b.id, type, strength, introducedBy]);
    relationshipCount++;
  }

  for (let i = 0; i < 6; i++) {
    await addRelation(i, i + 1, '同学', randomInt(3, 5));
  }
  for (let i = 6; i < 14; i++) {
    await addRelation(i, i + 1, '同事', randomInt(2, 4));
  }
  await addRelation(0, 14, '夫妻', 5);
  await addRelation(3, 15, '亲属', 4);
  await addRelation(14, 16, '亲属', 3, persons[0].id);
  await addRelation(16, 17, '朋友', 4);

  for (let i = 0; i < 10; i++) {
    const a = randomInt(0, persons.length - 1);
    let b = randomInt(0, persons.length - 1);
    while (b === a) b = randomInt(0, persons.length - 1);
    await addRelation(a, b, '朋友', randomInt(2, 5));
  }

  for (let i = 0; i < 8; i++) {
    const a = randomInt(0, persons.length - 1);
    let b = randomInt(0, persons.length - 1);
    while (b === a) b = randomInt(0, persons.length - 1);
    await addRelation(a, b, '合作伙伴', randomInt(3, 5));
  }

  for (let i = 0; i < 6; i++) {
    const a = randomInt(0, persons.length - 1);
    let b = randomInt(0, persons.length - 1);
    while (b === a) b = randomInt(0, persons.length - 1);
    await addRelation(a, b, '客户', randomInt(2, 4));
  }

  for (let i = 0; i < 5; i++) {
    const a = randomInt(0, persons.length - 1);
    let b = randomInt(0, persons.length - 1);
    let intro = randomInt(0, persons.length - 1);
    while (b === a) b = randomInt(0, persons.length - 1);
    while (intro === a || intro === b) intro = randomInt(0, persons.length - 1);
    await addRelation(a, b, '引荐', randomInt(1, 3), persons[intro].id);
  }

  while (relationshipCount < 42) {
    const a = randomInt(0, persons.length - 1);
    let b = randomInt(0, persons.length - 1);
    while (b === a) b = randomInt(0, persons.length - 1);
    await addRelation(a, b, random(RELATION_TYPES), randomInt(1, 5));
  }
  console.log('[relationships] 插入 ' + relationshipCount + ' 条关系');

  const INTERACTION_CONTENTS = [
    '讨论了Q3品牌推广方案，对方表示有合作意向',
    '老朋友叙旧，了解到对方新公司近况',
    '参加行业活动，交换了名片，后续跟进',
    '商务午餐，敲定了初步合作框架',
    '电话沟通项目细节，约定下周面谈',
    '微信上分享了一篇行业文章，对方回复感谢',
    '面谈及合作细节，需要法务审核合同',
    '饭局上认识了对方的朋友，拓展了人脉',
    '参加线下沙龙，会后单独聊了合作可能性',
    '微信拜年，互相祝福，了解近况',
    '客户反馈项目进展顺利，准备进入下一阶段',
    '讨论了子女教育问题，互相推荐学校资源',
    '介绍了一个靠谱的服务商给对方',
    '约好下个月一起参加行业峰会',
    '收到对方寄来的节日礼物，回礼致谢',
    '远程视频会议，讨论了技术方案选型',
    '一起喝咖啡，聊了下行业趋势和个人发展',
    '对方公司遇到困难，提供了一些建议和资源',
    '确认了合同条款，准备签约',
    '偶然在机场偶遇，聊了半小时近况'
  ];

  const TODO_CONTENTS = [
    '下周一发送合作方案PPT',
    '月底前约对方技术负责人面谈',
    '推荐靠谱的律师朋友给对方',
    '下周跟进合同审核进度',
    '发送公司介绍资料和案例',
    '安排双方团队的线上交流会',
    '月底前完成报价单',
    '邀请对方参加公司年会',
    '帮对方对接投资机构朋友',
    '跟进招聘需求，推荐合适候选人',
    '准备品牌诊断报告初稿',
    '确认活动场地和时间'
  ];

  let interactionCount = 0;
  let todoCount = 0;

  const interactionsWithTodos = new Set();
  while (interactionsWithTodos.size < 7) {
    interactionsWithTodos.add(randomInt(0, 22));
  }

  for (let i = 0; i < 24; i++) {
    const person = persons[randomInt(0, persons.length - 1)];
    let dateStr;

    if (i < 4) {
      dateStr = today.subtract(randomInt(0, 6), 'day').format('YYYY-MM-DD');
    } else if (i < 10) {
      dateStr = today.subtract(randomInt(7, 29), 'day').format('YYYY-MM-DD');
    } else if (i < 15) {
      dateStr = today.subtract(randomInt(30, 89), 'day').format('YYYY-MM-DD');
    } else if (i < 20) {
      dateStr = today.subtract(randomInt(90, 179), 'day').format('YYYY-MM-DD');
    } else {
      dateStr = today.subtract(randomInt(180, 500), 'day').format('YYYY-MM-DD');
    }

    const method = INTERACTION_METHODS[i % INTERACTION_METHODS.length];
    const content = INTERACTION_CONTENTS[i % INTERACTION_CONTENTS.length];

    const result = await run('INSERT INTO interactions (person_id, interaction_date, method, content) VALUES (?, ?, ?, ?)',
      [person.id, dateStr, method, content]);
    interactionCount++;
    const interactionId = result.lastInsertRowid;

    if (interactionsWithTodos.has(i)) {
      const todoNum = randomInt(1, 3);
      for (let t = 0; t < todoNum; t++) {
        const isCompleted = Math.random() > 0.5 ? 1 : 0;
        const completedAt = isCompleted ? today.subtract(randomInt(0, 10), 'day').format('YYYY-MM-DD HH:mm:ss') : null;
        await run('INSERT INTO interaction_todos (interaction_id, content, is_completed, completed_at) VALUES (?, ?, ?, ?)',
          [interactionId, random(TODO_CONTENTS), isCompleted, completedAt]);
        todoCount++;
      }
    }
  }

  console.log('[interactions] 插入 ' + interactionCount + ' 条互动记录');
  console.log('[interaction_todos] 插入 ' + todoCount + ' 条待办');
  console.log('\n=== 种子数据生成完成 ===');
  console.log('persons: ' + persons.length);
  console.log('relationships: ' + relationshipCount);
  console.log('interactions: ' + interactionCount);
  console.log('todos: ' + todoCount);
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
