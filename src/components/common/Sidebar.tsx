/**
 * 智语 Studio — 侧边导航栏
 */
import { useLocation, useNavigate } from 'react-router-dom'
import { Menu } from 'antd'
import {
  MessageOutlined,
  AppstoreOutlined,
  DatabaseOutlined,
  ApiOutlined,
  SettingOutlined
} from '@ant-design/icons'
import type { ItemType } from 'antd/es/menu/interface'

const menuItems: ItemType[] = [
  { key: '/chat', icon: <MessageOutlined />, label: '聊天' },
  { key: '/models', icon: <AppstoreOutlined />, label: '模型管理' },
  { key: '/rag', icon: <DatabaseOutlined />, label: '知识库' },
  { key: '/api', icon: <ApiOutlined />, label: 'API 服务' },
  { key: '/settings', icon: <SettingOutlined />, label: '设置' }
]

export default function Sidebar() {
  const location = useLocation()
  const navigate = useNavigate()

  // 确定当前选中的菜单项
  const selectedKey = (menuItems.find(
    item => item?.key === location.pathname
  )?.key as string) || '/chat'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Logo 区域 */}
      <div style={{
        padding: '20px 16px 16px',
        textAlign: 'center',
        borderBottom: '1px solid #f0f0f0'
      }}>
        <div style={{
          fontSize: 20,
          fontWeight: 700,
          color: '#1677ff',
          letterSpacing: 2
        }}>
          智语 Studio
        </div>
        <div style={{
          fontSize: 12,
          color: '#999',
          marginTop: 4
        }}>
          本地大语言模型桌面应用
        </div>
      </div>

      {/* 导航菜单 */}
      <Menu
        mode="inline"
        selectedKeys={[selectedKey]}
        items={menuItems}
        onClick={({ key }) => navigate(key)}
        style={{
          flex: 1,
          borderRight: 0,
          paddingTop: 8,
          fontSize: 14
        }}
      />

      {/* 底部版本信息 */}
      <div style={{
        padding: '12px 16px',
        borderTop: '1px solid #f0f0f0',
        fontSize: 12,
        color: '#bbb',
        textAlign: 'center'
      }}>
        智语 Studio v1.0.0
      </div>
    </div>
  )
}
