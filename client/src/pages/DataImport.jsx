import { useState } from 'react';
import { Card, Typography, Upload, Button, Space, Alert, Row, Col, message, Spin } from 'antd';
import { InboxOutlined, DownloadOutlined, FileExcelOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { useAuthStore } from '../store/auth';
import request from '../utils/request';

const { Text, Paragraph } = Typography;
const { Dragger } = Upload;

export default function DataImport() {
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const token = useAuthStore((s) => s.token);

  const handleDownload = async (type) => {
    try {
      const url = type === 'template' ? '/data/template' : '/data/export';
      const resp = await request.get(url, { responseType: 'blob' });
      const blob = new Blob([resp], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = type === 'template' ? 'import_template.xlsx' : 'persons_export.xlsx';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
      message.success(type === 'template' ? '模板已下载' : '数据已导出');
    } catch (e) {
      message.error('下载失败');
    }
  };

  const customUpload = (options) => {
    const { file, onSuccess, onError } = options;
    const formData = new FormData();
    formData.append('file', file);
    setUploading(true);
    setResult(null);
    fetch('/api/data/import', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + token },
      body: formData
    })
      .then(async (resp) => {
        const data = await resp.json();
        if (!resp.ok) throw new Error(data.error || '导入失败');
        onSuccess(data, file);
        setResult(data);
        message.success('导入完成：成功 ' + data.success + ' 条');
      })
      .catch((err) => {
        onError(err);
        message.error(err.message || '导入失败');
      })
      .finally(() => setUploading(false));
  };

  return (
    <div style={{ padding: 24 }}>
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={14}>
          <Card title={<><FileExcelOutlined style={{ color: '#34D399' }} /> 批量导入人脉</>}>
            <Spin spinning={uploading}>
              <Dragger
                accept=".xlsx,.xls,.csv"
                multiple={false}
                showUploadList={false}
                customRequest={customUpload}
                disabled={uploading}
              >
                <p className="ant-upload-drag-icon">
                  <InboxOutlined style={{ color: '#5B6CFF', fontSize: 48 }} />
                </p>
                <p className="ant-upload-text" style={{ fontSize: 15, fontWeight: 600 }}>点击或拖拽 Excel/CSV 文件到此处导入</p>
                <p className="ant-upload-hint">支持 .xlsx / .xls / .csv 格式，请先下载导入模板查看字段格式</p>
              </Dragger>
            </Spin>

            <Space style={{ marginTop: 16 }}>
              <Button type="primary" icon={<DownloadOutlined />} onClick={() => handleDownload('template')}>下载导入模板</Button>
              <Button icon={<DownloadOutlined />} onClick={() => handleDownload('export')}>导出全部人脉</Button>
            </Space>

            {result && (
              <Alert
                style={{ marginTop: 16 }}
                type={result.failed > 0 ? 'warning' : 'success'}
                showIcon
                icon={<CheckCircleOutlined />}
                message={
                  <Space wrap>
                    <Text>共 {result.total} 行</Text>
                    <Text type="success">成功 {result.success} 条</Text>
                    {result.failed > 0 && <Text type="danger">失败 {result.failed} 条</Text>}
                  </Space>
                }
                description={
                  result.errors && result.errors.length > 0 ? (
                    <div style={{ marginTop: 8 }}>
                      <Text type="secondary" style={{ fontSize: 12 }}>错误详情（最多显示20条）：</Text>
                      <div style={{ marginTop: 4, maxHeight: 200, overflow: 'auto', background: '#fffbe6', padding: 8, borderRadius: 4, fontSize: 12 }}>
                        {result.errors.map((e, i) => <div key={i} style={{ color: '#d4380d' }}>{e}</div>)}
                      </div>
                    </div>
                  ) : null
                }
              />
            )}
          </Card>
        </Col>

        <Col xs={24} lg={10}>
          <Card title="导入说明" size="small">
            <Paragraph><Text strong>必填字段：</Text>姓名</Paragraph>
            <Paragraph><Text strong>可选字段：</Text>电话、微信、邮箱、生日（YYYY-MM-DD）、城市、公司、职位、亲密度（1-5）、资源描述、需求描述、备注、标签</Paragraph>
            <Paragraph><Text strong>标签字段：</Text>多个标签用顿号、逗号或分号分隔，如「客户、朋友」。标签需在系统中已存在才能关联。</Paragraph>
            <Paragraph><Text strong>亲密度：</Text>填 1-5 的数字，留空默认为 3。</Paragraph>
            <Paragraph type="warning" style={{ marginBottom: 0 }}>
              <Text type="warning">注意：</Text>导入为新增操作，不会覆盖已有数据。如需更新已有人物，请到人脉档案页编辑。
            </Paragraph>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
