/**
 * 智语 Studio — 主布局
 * 包含侧边栏、内容区和状态栏
 */
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Layout } from 'antd'
import Sidebar from '../components/common/Sidebar'
import StatusBar from '../components/common/StatusBar'

export default function MainLayout() {
  return (
    <div className="app-layout">
      <div className="main-container">
        <div className="sidebar">
          <Sidebar />
        </div>
        <div className="content-area">
          <Outlet />
        </div>
      </div>
      <StatusBar />
    </div>
  )
}
