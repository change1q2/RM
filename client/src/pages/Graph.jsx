import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Row, Col, Select, Radio, Button, Spin, Empty, Space, Typography, Tag, message } from 'antd';
import { ReloadOutlined, ShareAltOutlined, AimOutlined } from '@ant-design/icons';
import ReactECharts from 'echarts-for-react';
import request from '../utils/request';

const { Text } = Typography;

const RELATION_COLORS = {
  '同学': '#5B6CFF', '同事': '#60A5FA', '前同事': '#A78BFA', '朋友': '#34D399',
  '亲戚': '#F59E0B', '客户': '#EF4444', '合作伙伴': '#14B8A6', '引荐': '#F472B6',
  '夫妻': '#EC4899', '邻居': '#06B6D4', '师生': '#8B5CF6', '同乡': '#F97316',
  '亲属': '#F59E0B', '其他': '#9CA3AF'
};

const intimacySize = (v) => {
  const s = { 1: 28, 2: 34, 3: 42, 4: 50, 5: 58 };
  return s[v] || 36;
};

export default function Graph() {
  const navigate = useNavigate();
  const [allPersons, setAllPersons] = useState([]);
  const [centerId, setCenterId] = useState(null);
  const [depth, setDepth] = useState(2);
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  const [loading, setLoading] = useState(false);
  const chartRef = useRef(null);

  useEffect(() => {
    request.get('/persons', { params: { pageSize: 9999, sortBy: 'intimacy' } })
      .then(data => {
        const list = data.list || [];
        setAllPersons(list);
        if (list.length > 0 && !centerId) {
          request.get('/graph/random')
            .then(r => { if (r && r.id) setCenterId(r.id); })
            .catch(() => { if (list[0]) setCenterId(list[0].id); });
        }
      })
      .catch(() => {});
  }, []);

  const fetchGraph = useCallback(async () => {
    if (!centerId) return;
    setLoading(true);
    try {
      const data = await request.get('/graph/' + centerId, { params: { depth } });
      setGraphData(data || { nodes: [], links: [] });
    } catch (e) {} finally { setLoading(false); }
  }, [centerId, depth]);

  useEffect(() => { fetchGraph(); }, [fetchGraph]);

  const relStats = useMemo(() => {
    const stats = {};
    (graphData.links || []).forEach(l => {
      stats[l.relation_type] = (stats[l.relation_type] || 0) + 1;
    });
    return stats;
  }, [graphData]);

  const centerPerson = allPersons.find(p => String(p.id) === String(centerId));

  const handleNodeClick = (params) => {
    if (params.dataType === 'node' && params.data) {
      const pid = params.data.id;
      navigate('/persons/' + pid);
    }
  };

  const getOption = () => {
    const nodes = (graphData.nodes || []).map(n => ({
      id: n.id,
      name: n.name,
      symbolSize: intimacySize(n.intimacy),
      value: n.intimacy,
      itemStyle: {
        color: n.is_center ? '#5B6CFF' : (n.intimacy >= 4 ? '#34D399' : '#A78BFA'),
        borderColor: n.is_center ? '#3B4CFF' : '#fff',
        borderWidth: n.is_center ? 4 : 2,
        shadowBlur: n.is_center ? 20 : 8,
        shadowColor: n.is_center ? 'rgba(91,108,255,0.5)' : 'rgba(0,0,0,0.15)'
      },
      label: {
        show: true,
        position: 'bottom',
        formatter: n.name.length > 5 ? n.name.slice(0, 4) + '…' : n.name,
        fontSize: n.is_center ? 14 : 11,
        fontWeight: n.is_center ? 'bold' : 'normal',
        color: '#333'
      },
      raw: n
    }));

    const linkCount = (graphData.links || []).length;
    const links = (graphData.links || []).map((l) => ({
      source: l.source,
      target: l.target,
      value: l.relation_type,
      lineStyle: {
        width: l.strength || 2,
        color: RELATION_COLORS[l.relation_type] || '#ccc',
        curveness: 0.15,
        opacity: 0.6
      },
      label: {
        show: linkCount <= 25,
        formatter: l.relation_type,
        fontSize: 10,
        color: RELATION_COLORS[l.relation_type] || '#999',
        backgroundColor: 'rgba(255,255,255,0.7)',
        padding: [1, 3],
        borderRadius: 3
      }
    }));

    return {
      tooltip: {
        formatter: (params) => {
          if (params.dataType === 'node') {
            const d = params.data.raw || {};
            const tags = (d.tags || []).map(t => t.name).join('、') || '无';
            return '<div style="font-weight:bold;font-size:13px;margin-bottom:4px">' + (d.name || '') + '</div>' +
              '<div style="font-size:12px;color:#666">' + ([d.company, d.position].filter(Boolean).join(' · ') || '') + '</div>' +
              '<div style="font-size:12px;margin-top:4px">亲密度：' + '★'.repeat(d.intimacy || 0) + '☆'.repeat(5 - (d.intimacy || 0)) + '</div>' +
              '<div style="font-size:11px;color:#999;margin-top:2px">标签：' + tags + '</div>' +
              '<div style="font-size:11px;color:#5B6CFF;margin-top:4px">点击查看详情</div>';
          } else if (params.dataType === 'edge') {
            return '<div style="font-size:12px">关系：<b>' + params.data.value + '</b></div>' +
              '<div style="font-size:11px;color:#999">强度：' + '★'.repeat(params.data.lineStyle.width || 2) + '</div>';
          }
          return '';
        }
      },
      legend: [{
        data: Object.keys(relStats),
        orient: 'vertical',
        right: 10,
        top: 20,
        textStyle: { fontSize: 11 }
      }],
      series: [{
        type: 'graph',
        layout: 'force',
        roam: true,
        draggable: true,
        focusNodeAdjacency: true,
        force: {
          repulsion: 300,
          edgeLength: [80, 160],
          gravity: 0.08,
          layoutAnimation: true
        },
        emphasis: {
          focus: 'adjacency',
          lineStyle: { width: 4, opacity: 1 },
          label: { fontSize: 14, fontWeight: 'bold' }
        },
        data: nodes,
        links: links,
        lineStyle: { color: '#ccc' }
      }],
      animationDuration: 800,
      animationEasingUpdate: 'cubicInOut'
    };
  };

  return (
    <div style={{ padding: 24 }}>
      <Card style={{ marginBottom: 16 }}>
        <Row gutter={[12, 12]} align="middle">
          <Col xs={24} sm={12} md={8} lg={6}>
            <Select
              showSearch
              style={{ width: '100%' }}
              placeholder="搜索并选择中心人物"
              value={centerId}
              onChange={v => setCenterId(v)}
              optionFilterProp="label"
              filterOption={(input, option) => (option?.label ?? '').toLowerCase().includes(input.toLowerCase())}
            >
              {allPersons.map(p => (
                <Select.Option key={p.id} value={p.id} label={p.name + (p.company ? ' · ' + p.company : '')}>
                  <Space>
                    <span>{p.name}</span>
                    {p.company && <span style={{ color: '#999', fontSize: 12 }}>· {p.company}</span>}
                  </Space>
                </Select.Option>
              ))}
            </Select>
          </Col>
          <Col xs={24} sm={12} md={8} lg={6}>
            <Space>
              <Text type="secondary">展开深度：</Text>
              <Radio.Group value={depth} onChange={e => setDepth(e.target.value)}>
                <Radio.Button value={1}>一度</Radio.Button>
                <Radio.Button value={2}>二度</Radio.Button>
              </Radio.Group>
            </Space>
          </Col>
          <Col xs={24} sm={12} md={8} lg={6}>
            <Space>
              <Button icon={<ReloadOutlined />} onClick={fetchGraph}>刷新</Button>
              <Button type="primary" icon={<AimOutlined />} onClick={() => {
                request.get('/graph/random').then(r => { if (r && r.id) setCenterId(r.id); }).catch(() => message.info('暂无数据'));
              }}>随机人物</Button>
            </Space>
          </Col>
          <Col xs={24} lg={6}>
            <div style={{ textAlign: 'right' }}>
              <Tag color="blue" icon={<ShareAltOutlined />}>
                节点 {graphData.nodes?.length || 0} · 关系 {graphData.links?.length || 0}
              </Tag>
            </div>
          </Col>
        </Row>
      </Card>

      <Card bodyStyle={{ padding: '8px 8px 16px 8px' }}>
        <Spin spinning={loading}>
          {(graphData.nodes || []).length === 0 ? (
            <Empty style={{ marginTop: 80 }} description={centerId ? '该人物暂无关系网络' : '请选择中心人物'} />
          ) : (
            <>
              <div style={{ padding: '8px 12px', borderBottom: '1px solid #f0f0f0', marginBottom: 8 }}>
                <Space wrap>
                  <Text strong>{centerPerson?.name || '关系图谱'}</Text>
                  <Text type="secondary">为中心 · 展开 {depth} 度人脉</Text>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    （拖拽节点可移动，滚轮缩放，单击节点跳转详情，拖拽空白处平移视图）
                  </Text>
                </Space>
              </div>
              <ReactECharts
                ref={chartRef}
                option={getOption()}
                style={{ height: 'calc(100vh - 320px)', minHeight: 480 }}
                onEvents={{ click: handleNodeClick }}
              />
            </>
          )}
        </Spin>
      </Card>
    </div>
  );
}
