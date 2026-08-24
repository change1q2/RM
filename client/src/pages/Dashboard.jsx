import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Row, Col, Card, Typography, Spin, Empty, List, Tag, Avatar, Rate, Space, Button, Statistic } from 'antd';
import {
  TeamOutlined, ShareAltOutlined, MessageOutlined, GiftOutlined,
  ClockCircleOutlined, CheckSquareOutlined, AlertOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import request from '../utils/request';

const { Text } = Typography;

const avatarColor = (name) => {
  const colors = ['#5B6CFF','#F472B6','#60A5FA','#34D399','#F59E0B','#EF4444','#A78BFA','#14B8A6','#06B6D4','#8B5CF6'];
  const code = (name || '?').charCodeAt(0) || 0;
  return colors[code % colors.length];
};

const formatDate = (dateStr) => {
  if (!dateStr) return '未联系';
  const d = dayjs(dateStr);
  const now = dayjs();
  const diff = now.diff(d, 'day');
  if (diff === 0) return '今天';
  if (diff === 1) return '昨天';
  if (diff < 30) return diff + '天前';
  if (diff < 365) return Math.floor(diff / 30) + '个月前';
  return Math.floor(diff / 365) + '年前';
};

const methodColor = (method) => {
  const map = { '微信': '#07C160', '电话': '#5B6CFF', '饭局': '#F59E0B', '见面': '#A78BFA', '面谈': '#A78BFA', '邮件': '#60A5FA', '活动': '#EF4444', '社群': '#EF4444', '其他': '#999' };
  return map[method] || '#999';
};

export default function Dashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [data, setData] = useState({ upcoming_birthdays: [], overdue_contacts: [], recent_interactions: [], pending_todos: [] });

  useEffect(() => {
    Promise.all([
      request.get('/meta/stats'),
      request.get('/meta/dashboard')
    ]).then(([s, d]) => {
      setStats(s);
      setData(d || {});
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ padding: 24, textAlign: 'center' }}><Spin /></div>;

  return (
    <div style={{ padding: 24 }}>
      <Row gutter={[16, 16]}>
        <Col xs={12} sm={6}>
          <Card hoverable onClick={() => navigate('/persons')}>
            <Statistic title="人脉总数" value={stats?.total_persons || 0} prefix={<TeamOutlined style={{ color: '#5B6CFF' }} />} valueStyle={{ color: '#5B6CFF' }} />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card hoverable onClick={() => navigate('/graph')}>
            <Statistic title="关系数量" value={stats?.total_relationships || 0} prefix={<ShareAltOutlined style={{ color: '#34D399' }} />} valueStyle={{ color: '#34D399' }} />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic title="近30天互动" value={stats?.recent_interactions || 0} prefix={<MessageOutlined style={{ color: '#F59E0B' }} />} valueStyle={{ color: '#F59E0B' }} />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card hoverable onClick={() => navigate('/settings')}>
            <Statistic title="标签数" value={(stats?.tag_distribution || []).length} prefix={<CheckSquareOutlined style={{ color: '#A78BFA' }} />} valueStyle={{ color: '#A78BFA' }} />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={12}>
          <Card title={<><GiftOutlined style={{ color: '#EF4444' }} /> 即将生日（30天内）</>} bodyStyle={{ maxHeight: 320, overflow: 'auto' }}>
            {(data.upcoming_birthdays || []).length === 0 ? (
              <Empty description="近30天无生日" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            ) : (
              <List dataSource={data.upcoming_birthdays || []} renderItem={p => (
                <List.Item actions={[<Tag key="b" color="red">{dayjs(p.birthday).format('MM-DD')}</Tag>]} onClick={() => navigate('/persons/' + p.id)} style={{ cursor: 'pointer' }}>
                  <List.Item.Meta avatar={<Avatar style={{ background: avatarColor(p.name) }}>{(p.name || '?').charAt(0)}</Avatar>} title={p.name} description={[p.company, p.city].filter(Boolean).join(' · ')} />
                </List.Item>
              )} />
            )}
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card title={<><AlertOutlined style={{ color: '#F59E0B' }} /> 该联系了（60天+未互动）</>} bodyStyle={{ maxHeight: 320, overflow: 'auto' }}>
            {(data.overdue_contacts || []).length === 0 ? (
              <Empty description="近期都联系过" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            ) : (
              <List dataSource={data.overdue_contacts || []} renderItem={p => (
                <List.Item actions={[<Rate key="r" count={5} value={p.intimacy} disabled style={{ fontSize: 11 }} />]} onClick={() => navigate('/persons/' + p.id)} style={{ cursor: 'pointer' }}>
                  <List.Item.Meta avatar={<Avatar style={{ background: avatarColor(p.name) }}>{(p.name || '?').charAt(0)}</Avatar>} title={<Space>{p.name}{p.company && <Text type="secondary" style={{ fontSize: 12 }}>{p.company}</Text>}</Space>} description={<Text type="secondary" style={{ fontSize: 12 }}>上次联系：{formatDate(p.last_interacted_at)}</Text>} />
                </List.Item>
              )} />
            )}
          </Card>
        </Col>

        <Col xs={24} lg={14}>
          <Card title={<><ClockCircleOutlined style={{ color: '#5B6CFF' }} /> 最近互动</>} bodyStyle={{ maxHeight: 360, overflow: 'auto' }}>
            {(data.recent_interactions || []).length === 0 ? (
              <Empty description="暂无互动记录" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            ) : (
              <List dataSource={data.recent_interactions || []} renderItem={item => (
                <List.Item onClick={() => navigate('/persons/' + item.person_id)} style={{ cursor: 'pointer' }}>
                  <List.Item.Meta
                    avatar={<Avatar style={{ background: avatarColor(item.name) }}>{(item.name || '?').charAt(0)}</Avatar>}
                    title={<Space wrap><Text strong>{item.name}</Text><Tag color={methodColor(item.method)}>{item.method}</Tag><Text type="secondary" style={{ fontSize: 12 }}>{dayjs(item.interaction_date).format('MM-DD')}</Text></Space>}
                    description={<Text ellipsis style={{ maxWidth: '100%' }}>{item.content || '无内容'}</Text>}
                  />
                </List.Item>
              )} />
            )}
          </Card>
        </Col>

        <Col xs={24} lg={10}>
          <Card title={<><CheckSquareOutlined style={{ color: '#34D399' }} /> 待办事项</>} extra={<Tag color="orange">{(data.pending_todos || []).length}</Tag>} bodyStyle={{ maxHeight: 360, overflow: 'auto' }}>
            {(data.pending_todos || []).length === 0 ? (
              <Empty description="暂无待办" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            ) : (
              <List dataSource={data.pending_todos || []} renderItem={todo => (
                <List.Item onClick={() => navigate('/persons/' + todo.person_id)} style={{ cursor: 'pointer' }}>
                  <List.Item.Meta
                    avatar={<CheckSquareOutlined style={{ color: '#bbb', fontSize: 16, marginTop: 4 }} />}
                    title={<Text style={{ fontSize: 13 }}>{todo.content}</Text>}
                    description={<Space size="small"><Text type="secondary" style={{ fontSize: 11 }}>{todo.name}</Text><Text type="secondary" style={{ fontSize: 11 }}>· {dayjs(todo.interaction_date).format('MM-DD')}</Text></Space>}
                  />
                </List.Item>
              )} />
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
}
